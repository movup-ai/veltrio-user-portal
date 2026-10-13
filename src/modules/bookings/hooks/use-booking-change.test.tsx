import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { ApiError } from '@/types/api'
import { bookingKeys } from './use-bookings'

const change = vi.fn<() => Promise<unknown>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))
vi.mock('../api/booking.api', () => ({ bookingApi: { change: () => change() } }))

const { useChangeBooking } = await import('./use-booking-change')

function setup() {
  const client = new QueryClient()
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const { result } = renderHook(() => useChangeBooking('BK-10001', 'Marisol Vega'), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  })
  const send = () => act(() => result.current.mutateAsync({ request: { vehicleId: 'v2' }, total: 100 }))
  return { send, invalidate }
}

afterEach(() => {
  change.mockReset()
  vi.mocked(toast).mockReset()
})

describe('useChangeBooking', () => {
  it('says what the counter has to do again once the change is made', async () => {
    change.mockResolvedValue({ emailQueued: true, agreementVoided: true, depositReleased: true })
    const { send, invalidate } = setup()

    await send()

    expect(toast).toHaveBeenCalledWith({
      title: 'Booking updated',
      description:
        'The agreement was voided: issue it again. The deposit hold was released: request it again. ' +
        'An email is on its way to Marisol Vega with what changed.',
      variant: 'success',
    })
    // The booking, its money and its agreement all read differently now.
    expect(invalidate).toHaveBeenCalledTimes(3)
  })

  it('says so when no email could tell the renter', async () => {
    change.mockResolvedValue({ emailQueued: false, agreementVoided: false, depositReleased: false })
    const { send } = setup()

    await send()

    expect(vi.mocked(toast).mock.calls[0][0].description).toBe(
      "Email isn't set up, so Marisol Vega was not told. Message them yourself.",
    )
  })

  it('leaves a refusal to the dialog, and re-reads a booking that moved under it', async () => {
    change.mockRejectedValue(
      new ApiError('conflict', 'The vehicle has been picked up', { status: 409, code: 'not_before_pickup' }),
    )
    const { send, invalidate } = setup()

    await expect(send()).rejects.toThrow()

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: bookingKeys.all }))
    expect(toast).not.toHaveBeenCalled()
  })
})
