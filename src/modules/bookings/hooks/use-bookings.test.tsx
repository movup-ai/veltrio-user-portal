import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { BookedInterval } from '../types/booking.types'

const schedule = vi.fn()

vi.mock('../api/booking.api', () => ({
  bookingApi: {
    schedule: (...args: unknown[]) => schedule(...args),
  },
}))

const { useBookingSchedule } = await import('./use-bookings')

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const INTERVAL: BookedInterval = {
  reference: 'BK-10001',
  vehicleId: 'v1',
  plate: 'ABC-123',
  from: '2026-10-01T09:30:00.000Z',
  to: '2026-10-02T09:30:00.000Z',
}

describe('useBookingSchedule', () => {
  it('is not ready while the first window is still loading', async () => {
    // The bug this pins: nothing is stale on the first load, because there is no previous
    // result to keep — so `!isStale` would call an empty schedule ready and mark every car free.
    let resolve: (value: BookedInterval[]) => void = () => {}
    schedule.mockReturnValueOnce(new Promise<BookedInterval[]>((r) => (resolve = r)))

    const { result } = renderHook(
      () => useBookingSchedule('2026-10-01T09:30', '2026-10-02T09:30', true),
      { wrapper: wrapper() },
    )

    expect(result.current.data).toBeUndefined()
    expect(result.current.isStale).toBe(false)
    expect(result.current.isReady).toBe(false)

    resolve([INTERVAL])
    await waitFor(() => expect(result.current.isReady).toBe(true))
  })

  it('is not ready when disabled, however stale-free the query looks', () => {
    const { result } = renderHook(() => useBookingSchedule('', '', false), { wrapper: wrapper() })

    expect(result.current.isReady).toBe(false)
  })

  it('is ready once the requested window has arrived', async () => {
    schedule.mockResolvedValueOnce([INTERVAL])

    const { result } = renderHook(
      () => useBookingSchedule('2026-10-01T09:30', '2026-10-02T09:30', true),
      { wrapper: wrapper() },
    )

    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.data).toEqual([INTERVAL])
  })
})
