import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/types/api'
import { applyVehicleApiError } from './vehicle-errors'

/** Stands in for react-hook-form's setError, recording what the form would be told. */
function recorder() {
  const calls: Array<[string, string | undefined]> = []
  const setError = vi.fn((field: string, err: { message?: string }) => {
    calls.push([field, err.message])
  })
  return { calls, setError: setError as never }
}

describe('applyVehicleApiError', () => {
  it('puts a duplicate VIN on the vin field and points at its step', () => {
    const { calls, setError } = recorder()
    const result = applyVehicleApiError(
      new ApiError('conflict', 'A vehicle with this VIN already exists', {
        status: 409,
        code: 'vin_already_exists',
      }),
      setError,
    )

    expect(calls).toHaveLength(1)
    expect(calls[0][0]).toBe('vin')
    expect(result.handled).toBe(true)
    // Vehicle details is step 0 — the user has to go back there to change it.
    expect(result.step).toBe(0)
  })

  it('maps 422 field errors onto the matching form fields', () => {
    const { calls, setError } = recorder()
    const result = applyVehicleApiError(
      new ApiError('validation', 'Request validation failed', {
        status: 422,
        code: 'validation_error',
        fieldErrors: [
          { field: 'vin', message: "String should match pattern '^[A-HJ-NPR-Z0-9]{17}$'" },
          { field: 'mileage', message: 'Input should be greater than or equal to 0' },
        ],
      }),
      setError,
    )

    expect(calls.map(([field]) => field)).toEqual(['vin', 'mileage'])
    expect(result.handled).toBe(true)
  })

  it('returns the earliest step so the user lands on the first thing to fix', () => {
    const { setError } = recorder()
    const result = applyVehicleApiError(
      new ApiError('validation', 'Request validation failed', {
        status: 422,
        fieldErrors: [
          { field: 'depositCents', message: 'bad' }, // pricing, step 2
          { field: 'plate', message: 'bad' }, // details, step 0
        ],
      }),
      setError,
    )

    expect(result.step).toBe(0)
  })

  it('translates wire field names the form does not use', () => {
    const { calls, setError } = recorder()
    applyVehicleApiError(
      new ApiError('validation', 'x', {
        status: 422,
        fieldErrors: [
          { field: 'depositCents', message: 'bad' },
          { field: 'overageRatePerMileCents', message: 'bad' },
        ],
      }),
      setError,
    )

    expect(calls.map(([field]) => field)).toEqual(['deposit', 'overageRatePerMile'])
  })

  it('reports unhandled when no error maps to a field, so the caller can toast instead', () => {
    const { calls, setError } = recorder()
    const result = applyVehicleApiError(
      new ApiError('server_error', 'Internal server error', { status: 500 }),
      setError,
    )

    expect(calls).toHaveLength(0)
    expect(result.handled).toBe(false)
    expect(result.message).toBe('Internal server error')
  })

  it('ignores field names with no control to attach to', () => {
    const { calls, setError } = recorder()
    const result = applyVehicleApiError(
      new ApiError('validation', 'x', {
        status: 422,
        fieldErrors: [{ field: 'tenantId', message: 'bad' }],
      }),
      setError,
    )

    expect(calls).toHaveLength(0)
    expect(result.handled).toBe(false)
  })
})
