import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BookingTuple } from '../types/booking.types'
import { bookingDurationDays, bookingPickupOrdinal, bookingsForTab, filterBookings } from './booking.filters'
import { EMPTY_BOOKING_LISTS } from './booking.filters'

/**
 * A row as the API produces it: display text for the table, plus the real instants the
 * filters actually compare on. The formatted window carries no year, which is exactly the
 * trap these tests guard.
 */
function row(overrides: {
  reference?: string
  window?: string
  pickupAt?: string
  returnAt?: string
  status?: string
}): BookingTuple {
  return [
    'Marisol Vega',
    overrides.reference ?? 'BK-1',
    'Toyota Camry',
    'ABC1234',
    overrides.window ?? 'Sep 14 · 09:30 → Sep 18',
    '4 days',
    'Downtown',
    overrides.status ?? 'Confirmed',
    '$313.51',
    overrides.pickupAt,
    overrides.returnAt,
  ]
}

const TODAY = new Date('2026-09-23T10:00:00Z')

describe('dates keep their year', () => {
  afterEach(() => vi.useRealTimers())

  it('does not treat the same day in another year as today', () => {
    // The Today tab reads the real clock; unpinned, this only passed on TODAY's date.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(TODAY)
    const thisYear = row({ pickupAt: '2026-09-23T09:30:00Z', returnAt: '2026-09-25T09:30:00Z' })
    const nextYear = row({
      reference: 'BK-2',
      pickupAt: '2027-09-23T09:30:00Z',
      returnAt: '2027-09-25T09:30:00Z',
    })

    // Same month and day, a year apart — the old month·day ordinal could not tell them apart.
    expect(bookingPickupOrdinal(thisYear)).not.toBe(bookingPickupOrdinal(nextYear))

    // Today's tab takes the one picked up today and leaves next year's alone — the month·day
    // ordinal matched both, putting a 2027 rental on today's list.
    const lists = { ...EMPTY_BOOKING_LISTS, upcoming: [thisYear, nextYear] }
    expect(bookingsForTab('Today', lists).map((b) => b[1])).toEqual(['BK-1'])
  })

  it('counts a rental crossing new year as its real length, not one day', () => {
    const crossing = row({
      window: 'Dec 30 · 09:30 → Jan 3',
      pickupAt: '2026-12-30T09:30:00Z',
      returnAt: '2027-01-03T09:30:00Z',
    })

    // Month·day ordinals ran backwards across the year boundary and collapsed to 1.
    expect(bookingDurationDays(crossing)).toBe(4)
  })

  it('still reads the dashboard seeds, which carry no timestamps', () => {
    const seeded = row({ window: 'Sep 14 · 09:30 → Sep 18' })

    expect(bookingDurationDays(seeded)).toBe(4)
    expect(Number.isNaN(bookingPickupOrdinal(seeded))).toBe(false)
  })

  it('filters a pickup range on real dates', () => {
    const inRange = row({ pickupAt: '2026-09-24T09:30:00Z', returnAt: '2026-09-26T09:30:00Z' })
    const nextYear = row({
      reference: 'BK-2',
      pickupAt: '2027-09-24T09:30:00Z',
      returnAt: '2027-09-26T09:30:00Z',
    })

    const filtered = filterBookings([inRange, nextYear], {
      search: '',
      status: 'Any',
      location: 'All',
      pickup: { from: '2026-09-20', to: '2026-09-30' },
      make: 'All',
      durationBand: 'Any',
      valueBands: [],
    })

    // The 2027 booking shares a month and day with the range but is a year outside it.
    expect(filtered.map((b) => b[1])).toEqual(['BK-1'])
  })
})

describe('todayOrdinal', () => {
  it('lines up with a booking picked up the same day', async () => {
    const { todayOrdinal } = await import('./booking.filters')
    const todayRow = row({ pickupAt: TODAY.toISOString(), returnAt: '2026-09-25T09:30:00Z' })

    expect(bookingPickupOrdinal(todayRow)).toBe(todayOrdinal(TODAY))
  })
})
