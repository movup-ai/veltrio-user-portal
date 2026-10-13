import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const DSN = 'https://0123456789abcdef0123456789abcdef@o000000.ingest.sentry.io/1234567'

// One SDK for the file, started once: it reads its DSN as the module loads, and does not start twice.
let sdk: typeof import('@sentry/react')
let reporting: typeof import('./error-reporting')
let ApiError: typeof import('@/types/api').ApiError
const send = vi.fn(() => Promise.resolve(new Response('{}', { status: 200 })))

beforeAll(async () => {
  vi.stubEnv('VITE_SENTRY_DSN', DSN)
  vi.stubGlobal('fetch', send)
  sdk = await import('@sentry/react')
  reporting = await import('./error-reporting')
  ApiError = (await import('@/types/api')).ApiError
  reporting.initErrorReporting()
})

beforeEach(() => send.mockClear())

afterAll(async () => {
  await sdk.close()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

/** What was sent, as text: one envelope per reported error. */
const sent = () =>
  (send.mock.calls as unknown as [string, { body: string }][]).map(([, request]) => String(request.body))

describe('worthReporting', () => {
  it('reports what nobody at the screen can fix: a server fault, or something unrecognised', () => {
    expect(reporting.worthReporting(new ApiError('server_error', 'Server error', { status: 500 }))).toBe(true)
    expect(reporting.worthReporting(new ApiError('unknown', 'Unknown'))).toBe(true)
    expect(reporting.worthReporting(new TypeError('x is not a function'))).toBe(true)
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
    expect(expected.map((kind) => reporting.worthReporting(new ApiError(kind, kind)))).toEqual(
      expected.map(() => false),
    )
  })

  it('leaves out a request that never reached the server', () => {
    // Someone's wifi dropping is not ours to fix, and would bury the errors that are.
    expect(reporting.worthReporting(new ApiError('network_error', 'Offline'))).toBe(false)
  })
})

describe('reporting to Sentry', () => {
  it('sends a fault to the project the DSN names, and keeps an expected refusal to itself', async () => {
    reporting.reportError(new ApiError('validation', 'VIN already registered', { status: 422 }))
    await sdk.flush(2000)
    expect(send).not.toHaveBeenCalled()

    reporting.reportError(new Error('boom'))
    await sdk.flush(2000)

    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0]?.[0 as never]).toContain('o000000.ingest.sentry.io/api/1234567/envelope')
    expect(sent()[0]).toContain('boom')
  })

  it("sends an API fault by its status and code, never the API's own words", async () => {
    // The API writes its messages for the person at the screen, and they can name a renter.
    const fault = (code: string) =>
      new ApiError('server_error', 'Could not email jane.doe@example.com', { status: 502, code })

    reporting.reportError(fault('email_failed'))
    // The same kind of error thrown and never caught takes the other road in: the global handler.
    sdk.captureException(fault('sms_failed'))
    await sdk.flush(2000)

    expect(sent()).toHaveLength(2)
    expect(sent().join()).not.toContain('jane.doe@example.com')
    expect(sent()[0]).toContain('API 502 email_failed')
    expect(sent()[1]).toContain('API 502 sms_failed')
  })
})
