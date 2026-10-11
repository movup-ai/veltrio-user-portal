import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BookingListParams } from '@/modules/bookings/api/booking.mapper'

const asked: BookingListParams[] = []

vi.mock('@/modules/bookings/hooks/use-bookings', () => ({
  useBookingPage: (params: BookingListParams) => {
    asked.push(params)
    return {
      // Three pages' worth, so Next is there to press.
      data: { items: [], page: params.page, pageSize: params.pageSize, total: 30, totalPages: 3 },
      isLoading: false,
      isError: false,
      isStale: false,
      refetch: vi.fn(),
    }
  },
}))

vi.mock('@/modules/vehicles/hooks/use-vehicles', () => ({
  useVehicleThumbnails: () => new Map<string, string>(),
}))

const { CustomerBookings } = await import('./CustomerBookings')

const last = () => asked[asked.length - 1]

describe('CustomerBookings', () => {
  beforeEach(() => {
    asked.length = 0
  })

  it('starts another customer on their first page, wherever the last one was left', async () => {
    const user = userEvent.setup({ delay: null })
    const { rerender } = render(<CustomerBookings customerId="c1" />, { wrapper: MemoryRouter })

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(last()).toMatchObject({ page: 3, filters: { customerId: 'c1' } })

    // The page reuses this table between customers. Page 3 of a one-page history is an
    // empty table that says page 1, which reads as a customer who never booked.
    rerender(<CustomerBookings customerId="c2" />)

    expect(last()).toMatchObject({ page: 1, filters: { customerId: 'c2' } })
  })
})
