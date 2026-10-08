import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BookingExtension, BookingExtensions } from '../types/booking-extension.types'

const get = vi.fn<() => Promise<BookingExtensions>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))
vi.mock('../api/booking-extension.api', () => ({ bookingExtensionApi: { get: () => get() } }))

const { useBookingExtensions } = await import('./use-booking-extensions')

const EXPIRED: BookingExtension = {
  id: 'e1',
  status: 'expired',
  previousReturnAt: '2026-10-10T14:00:00Z',
  newReturnAt: '2026-10-12T14:00:00Z',
  previousTotal: 235.4,
  newTotal: 353.1,
  amount: 117.7,
  expiresAt: '2026-10-10T14:00:00Z',
  requestedAt: '2026-10-09T09:00:00Z',
  paymentOpen: false,
  refundDue: 0,
  hasAddendum: false,
}

async function readsAfterAMinute(extensions: BookingExtensions) {
  get.mockResolvedValue(extensions)
  // As the app sets it: with focus refetching off, nothing else re-reads an open page.
  const client = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } })
  renderHook(() => useBookingExtensions('BK-10001'), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  })
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(get).toHaveBeenCalledTimes(1)
  await act(() => vi.advanceTimersByTimeAsync(60_000))
  return get.mock.calls.length - 1
}

describe('useBookingExtensions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    get.mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it('keeps checking a request that ran out of time while its link can still be paid', async () => {
    const late = { ...EXPIRED, paymentOpen: true }

    expect(await readsAfterAMinute({ extend: { allowed: true }, history: [late] })).toBe(4)
  })

  it('leaves a booking alone once no money can arrive for any request', async () => {
    expect(await readsAfterAMinute({ extend: { allowed: true }, history: [EXPIRED] })).toBe(0)
  })
})
