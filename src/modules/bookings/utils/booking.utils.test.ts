import { describe, expect, it } from 'vitest'
import type { BookingTuple } from '../types/booking.types'
import { parseRentalWindow } from './booking.schedule'
import {
  bookingRow,
  formatRentalDuration,
  formatRentalWindow,
  isOver,
  shownStatus,
  withVehicleImage,
} from './booking.utils'

/** Noon UTC either end, so the formatted clock is the same day in any plausible run-time zone. */
const at = (day: number, hour = 12, minute = 0) =>
  new Date(Date.UTC(2026, 8, day, hour, minute)).toISOString()

describe('formatRentalWindow', () => {
  it('gives both ends a time, not just the pickup', () => {
    // A return with no hour reads as end-of-day, which is when the car is actually due back.
    const window = formatRentalWindow(at(24), at(27))

    expect(window).toMatch(/^Sep 24 · \d{2}:\d{2} → Sep 27 · \d{2}:\d{2}$/)
  })

  it('stays readable by the filters that parse it back', () => {
    // booking.filters.ts falls back to this string for seeded rows, so the shape is a contract.
    const parts = parseRentalWindow(formatRentalWindow(at(24), at(27)))

    expect(parts).toMatchObject({ fromMonth: 8, fromDay: 24, toMonth: 8, toDay: 27 })
  })
})

describe('formatRentalDuration', () => {
  it('calls a 24-hour rental one day', () => {
    expect(formatRentalDuration(at(24, 9, 30), at(25, 9, 30))).toBe('1 day')
  })

  it('shows the hours a part-day rental runs over', () => {
    // The bug this pins: rounding up billed 3 days 4h as a flat "4 days".
    expect(formatRentalDuration(at(24, 9, 30), at(27, 13, 30))).toBe('3 days 4h')
  })

  it('omits the day when the rental is shorter than one', () => {
    expect(formatRentalDuration(at(24, 9, 0), at(24, 15, 0))).toBe('6h')
  })

  it('omits the hours when the rental lands on a whole day', () => {
    expect(formatRentalDuration(at(24, 9, 0), at(28, 9, 0))).toBe('4 days')
  })

  it('never reads as nothing, however short the booking', () => {
    expect(formatRentalDuration(at(24, 9, 0), at(24, 9, 0))).toBe('1h')
  })
})

describe('withVehicleImage', () => {
  const tuple = (vehicleId?: string, plate = 'FL·7VC-283'): BookingTuple =>
    [
      'Edward Thomas',
      'BK-10001',
      'Honda Accord',
      plate,
      'Sep 24 · 09:30 → Sep 25 · 09:30',
      '1 day',
      'Miami Beach',
      'Deposit due',
      '$360',
      '2026-09-24T09:30:00Z',
      '2026-09-25T09:30:00Z',
      undefined,
      vehicleId,
    ] as BookingTuple

  it('attaches the cover shot for the booked car', () => {
    const row = withVehicleImage(tuple('v1'), new Map([['v1', 'https://cdn/thumb.webp']]))

    expect(row[11]).toBe('https://cdn/thumb.webp')
  })

  it('does not borrow a photo from another car sharing the plate', () => {
    // Plates are not unique — the live fleet has three rows on one plate — so keying the
    // lookup on the plate would put someone else's car in the row.
    const row = withVehicleImage(tuple('v2'), new Map([['v1', 'https://cdn/thumb.webp']]))

    expect(row[11]).toBeUndefined()
  })

  it('falls back to the icon when the vehicle is gone', () => {
    const row = withVehicleImage(tuple(undefined), new Map([['v1', 'https://cdn/thumb.webp']]))

    expect(row[11]).toBeUndefined()
  })

  it('leaves the rest of the row untouched', () => {
    const before = tuple('v1')
    const after = withVehicleImage(before, new Map([['v1', 'https://cdn/thumb.webp']]))

    expect(after.slice(0, 11)).toEqual(before.slice(0, 11))
    // A new tuple, since the caller's array belongs to the query cache.
    expect(after).not.toBe(before)
  })
})

describe('isOver', () => {
  it('ends a booking at close-off or cancellation, and nowhere before', () => {
    // The page hides Manage and Hand over on this. It used to ask whether the last progress step
    // was done, which a cancelled booking no longer is: its later steps are skipped.
    expect(['Completed', 'Cancelled'].map(isOver)).toEqual([true, true])
    expect(['Pending', 'Confirmed', 'On rental', 'Overdue', 'Returned'].some(isOver)).toBe(false)
  })
})

describe('bookingRow readiness badge', () => {
  const row = (status: string, ready: boolean, declined = false): BookingTuple =>
    [
      'Edward Thomas',
      'BK-10001',
      'Honda Accord',
      'FL·7VC-283',
      'Sep 24 · 09:30 → Sep 25 · 09:30',
      '1 day',
      'Miami Beach',
      status,
      '$360',
      '2026-09-24T09:30:00Z',
      '2026-09-25T09:30:00Z',
      undefined,
      'v1',
      ready,
      declined,
    ] as BookingTuple

  const badges = (tuple: BookingTuple) => {
    const cell = bookingRow(tuple).cells[5]
    return cell.kind === 'badges' ? cell.statuses : []
  }

  it('shows Ready in place of the status once paid and signed, never both', () => {
    // Two badges in one cell read as two statuses; Ready already means confirmed, paid and signed.
    expect(badges(row('Confirmed', true))).toEqual(['Ready'])
  })

  it('shows the status alone while the paperwork is outstanding', () => {
    expect(badges(row('Confirmed', false))).toEqual(['Confirmed'])
  })

  it('drops Ready once the car is out — the status already says so', () => {
    expect(badges(row('On rental', true))).toEqual(['On rental'])
    expect(badges(row('Completed', true))).toEqual(['Completed'])
  })

  it('reads Declined for a request the company turned down, not Cancelled', () => {
    // Both are `cancelled` to the API; without this a declined request looks like a lost rental.
    expect(badges(row('Cancelled', false, true))).toEqual(['Declined'])
    expect(badges(row('Cancelled', false))).toEqual(['Cancelled'])
    expect(shownStatus('Cancelled', true)).toBe('Declined')
    expect(shownStatus('Cancelled', false)).toBe('Cancelled')
  })
})
