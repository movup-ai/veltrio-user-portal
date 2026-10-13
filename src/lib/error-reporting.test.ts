import * as Sentry from '@sentry/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/types/api'
import { worthReporting } from './error-reporting'

describe('worthReporting', () => {
  it('reports what nobody at the screen can fix: a server fault, or something unrecognised', () => {
    expect(worthReporting(new ApiError('server_error', 'Server error', { status: 500 }))).toBe(true)
    expect(worthReporting(new ApiError('unknown', 'Unknown'))).toBe(true)
    expect(worthReporting(new TypeError('x is not a function'))).toBe(true)
  })

  it('leaves out the answers the user is shown and acts on', () => {
    // A duplicate VIN, a missing booking or an expired session is the app working as designed.
    const expected = [
      'unauthorized',
      'forbidden',
      'not_found',
      'conflict',
      'validation',
      'rate_limited',
    ] as const
    expect(expected.map((kind) => worthReporting(new ApiError(kind, kind)))).toEqual(
      expected.map(() => false),
    )
  })

  it('leaves out a request that never reached the server', () => {
    // Someone's wifi dropping is not ours to fix, and would bury the errors that are.
    expect(worthReporting(new ApiError('network_error', 'Offline'))).toBe(false)
  })
})

describe('reporting to Sentry', () => {
  const DSN = 'https://0123456789abcdef0123456789abcdef@o000000.ingest.sentry.io/1234567'

  afterEach(async () => {
    await Sentry.close()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  /** The module reads its DSN when loaded, so each case loads it afresh under its own environment. */
  async function load(dsn: string) {
    vi.stubEnv('VITE_SENTRY_DSN', dsn)
    const send = vi.fn(() => Promise.resolve(new Response('{}', { status: 200 })))
    vi.stubGlobal('fetch', send)
    vi.resetModules()
    const reporting = await import('./error-reporting')
    const api = await import('@/types/api')
    reporting.initErrorReporting()
    return { reporting, send, ApiError: api.ApiError }
  }

  it('sends a fault to the project the DSN names, and keeps an expected refusal to itself', async () => {
    const { reporting, send, ApiError: Refusal } = await load(DSN)

    reporting.reportError(new Refusal('validation', 'VIN already registered', { status: 422 }))
    await Sentry.flush(2000)
    expect(send).not.toHaveBeenCalled()

    reporting.reportError(new Error('boom'))
    await Sentry.flush(2000)

    expect(send).toHaveBeenCalledTimes(1)
    const [url, request] = send.mock.calls[0] as unknown as [string, { body: string }]
    expect(url).toContain('o000000.ingest.sentry.io/api/1234567/envelope')
    expect(String(request.body)).toContain('boom')
  })

  it('sends nothing at all without a DSN, as in development', async () => {
    const { reporting, send } = await load('')

    reporting.reportError(new Error('boom'))
    await Sentry.flush(2000)

    expect(send).not.toHaveBeenCalled()
  })
})
