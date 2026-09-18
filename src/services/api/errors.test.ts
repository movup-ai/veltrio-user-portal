import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { normalizeApiError } from './errors'

/** Builds the axios error shape the interceptor actually receives. */
function responseError(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  })
}

describe('normalizeApiError', () => {
  it('reads the backend error envelope', () => {
    const error = normalizeApiError(
      responseError(403, {
        error: { code: 'user_not_onboarded', message: 'User has not completed onboarding' },
      }),
    )

    expect(error.kind).toBe('forbidden')
    expect(error.code).toBe('user_not_onboarded')
    expect(error.message).toBe('User has not completed onboarding')
  })

  it('keeps the code for the conflict onboarding branches on', () => {
    const error = normalizeApiError(
      responseError(409, { error: { code: 'subdomain_taken', message: 'Subdomain is already taken' } }),
    )

    expect(error.code).toBe('subdomain_taken')
  })

  it('still parses FastAPI field errors, which carry no code', () => {
    const error = normalizeApiError(
      responseError(422, { detail: [{ loc: ['body', 'subdomain'], msg: 'is reserved' }] }),
    )

    expect(error.kind).toBe('validation')
    expect(error.code).toBeUndefined()
    expect(error.fieldErrors).toEqual([{ field: 'subdomain', message: 'is reserved' }])
  })

  it('falls back to a translated message when the body is not an error envelope', () => {
    const error = normalizeApiError(responseError(500, 'upstream exploded'))

    expect(error.kind).toBe('server_error')
    expect(error.code).toBeUndefined()
    expect(error.message).toBeTruthy()
  })
})
