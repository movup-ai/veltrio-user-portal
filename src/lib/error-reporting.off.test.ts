import { afterAll, describe, expect, it, vi } from 'vitest'

afterAll(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('reporting without a DSN', () => {
  it('sends nothing at all, as in development and CI', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '')
    const send = vi.fn(() => Promise.resolve(new Response('{}', { status: 200 })))
    vi.stubGlobal('fetch', send)
    const sdk = await import('@sentry/react')
    const reporting = await import('./error-reporting')

    reporting.initErrorReporting()
    reporting.reportError(new Error('boom'))
    await sdk.flush(2000)

    expect(send).not.toHaveBeenCalled()
  })
})
