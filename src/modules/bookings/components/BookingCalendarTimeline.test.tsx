import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import '@/i18n'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { CalendarVehicle } from '../types/booking-calendar.types'
import type { Booking } from '../types/booking.types'
import { calendarColumns, calendarRange, calendarRows } from '../utils/booking.calendar'
import { BookingCalendarTimeline } from './BookingCalendarTimeline'

/** Local time, as the calendar draws it. */
const at = (day: number, hour = 0) => new Date(2026, 8, day, hour)

const ACCORD: CalendarVehicle = { key: 'v1', id: 'v1', name: 'Honda Accord', plate: 'FL-AAA-1' }
const columns = calendarColumns('month', calendarRange('month', at(16), 0))

const OUT = {
  reference: 'BK-1',
  status: 'On rental',
  customer: { name: 'Marisol Vega' },
  vehicleId: 'v1',
  vehicleName: 'Honda Accord',
  vehiclePlate: 'FL-AAA-1',
  pickupAt: at(10, 9).toISOString(),
  returnAt: at(16, 12).toISOString(),
  payment: { state: 'paid', paid: 100, refunded: 0 },
  contract: {},
} as Booking

function timeline(bookings: Booking[], now: Date) {
  return (
    <MemoryRouter>
      <TooltipProvider>
        <BookingCalendarTimeline
          view="month"
          columns={columns}
          rows={calendarRows([ACCORD], bookings, columns, now.getTime())}
          now={now.getTime()}
          onOpenDay={() => {}}
        />
      </TooltipProvider>
    </MemoryRouter>
  )
}

describe('a booking box that is not rendered again while nothing about it changes', () => {
  it('still turns overdue when its return time passes on a page left open', () => {
    const { rerender } = render(timeline([OUT], at(16, 11)))
    expect(screen.getByRole('button', { name: /^BK-1: .*On rental/ })).toBeInTheDocument()

    rerender(timeline([OUT], at(16, 13)))

    expect(screen.getByRole('button', { name: /^BK-1: .*Overdue/ })).toBeInTheDocument()
  })

  it('still follows the booking when a refetch brings new dates', () => {
    const { rerender } = render(timeline([OUT], at(16, 11)))
    const before = screen.getByRole('button', { name: /^BK-1:/ }).style.width

    rerender(timeline([{ ...OUT, returnAt: at(20, 12).toISOString() }], at(16, 11)))

    expect(screen.getByRole('button', { name: /^BK-1:/ }).style.width).not.toBe(before)
  })
})
