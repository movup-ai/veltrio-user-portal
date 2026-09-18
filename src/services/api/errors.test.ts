import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { normalizeApiError } from './errors'

/** Builds the axios error shape the interceptor actually receives. */
function apiResponse(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, {}, {
    status,
    statusText: '',
    data,
    headers: {},
    config,
  } as never)
}

const envelope = (code: string, message: string, details: unknown = null) => ({
  error: { code, message, details },
})

describe('normalizeApiError', () => {
  it('carries the API error code through', () => {
    // Without this, every 403 looks alike and the router cannot tell "needs onboarding"
    // from "suspended" — which sent signed-in users back to /login.
    const error = normalizeApiError(
      apiResponse(403, envelope('user_not_onboarded', 'User has not completed onboarding')),
    )

    expect(error.kind).toBe('forbidden')
    expect(error.code).toBe('user_not_onboarded')
    expect(error.message).toBe('User has not completed onboarding')
  })

  it('maps statuses to kinds', () => {
    expect(normalizeApiError(apiResponse(401, envelope('invalid_token', 'Bad'))).kind).toBe('unauthorized')
    expect(normalizeApiError(apiResponse(404, envelope('not_found', 'Gone'))).kind).toBe('not_found')
    expect(normalizeApiError(apiResponse(409, envelope('vin_already_exists', 'Dup'))).kind).toBe('conflict')
    expect(normalizeApiError(apiResponse(503, envelope('down', 'Down'))).kind).toBe('server_error')
  })

  it('reads validation field errors from the envelope details', () => {
    const error = normalizeApiError(
      apiResponse(
        422,
        envelope('validation_error', 'Request validation failed', [
          { loc: ['body', 'specs', 'seats'], msg: 'must be >= 1' },
        ]),
      ),
    )

    expect(error.fieldErrors).toEqual([{ field: 'seats', message: 'must be >= 1' }])
  })

  it('still understands a bare FastAPI detail, which can come from in front of the app', () => {
    const error = normalizeApiError(apiResponse(404, { detail: 'Not Found' }))
    expect(error.message).toBe('Not Found')
    expect(error.code).toBeUndefined()
  })

  it('reports a request that never reached the server as a network error', () => {
    const offline = new AxiosError('Network Error', 'ERR_NETWORK')
    expect(normalizeApiError(offline).kind).toBe('network_error')
  })
})
