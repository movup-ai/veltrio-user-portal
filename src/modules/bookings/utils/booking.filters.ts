import {
  BOOKING_DURATION_BANDS,
  BOOKING_OVERDUE_STATUSES,
  BOOKING_VALUE_BANDS,
  type BookingFilters,
  type BookingLists,
  type BookingPickupRange,
  type BookingTab,
  type BookingTuple,
} from '../types/booking.types'
import { parseRentalWindow } from './booking.schedule'
import { parseBookingTotal } from './booking.utils'

/**
 * A month·day ordinal — enough to diff two dates and compare against "today" without a year.
 * Deliberately *not* real dates: the list's Today tab and pickup presets are anchored to the
 * seed data's own "today" (below) so the tabs stay meaningful whenever the app is run.
 * Availability checks need genuine timestamps and use booking.schedule.ts instead.
 */
function ordinal(month: number, day: number): number {
  return month * 31 + day
}

/** The mock data set is pinned to this day — every "upcoming" booking is relative to it. */
export const MOCK_TODAY = ordinal(8, 14)

/** "Sep 14 · 09:30 → Sep 18" → `[pickup, dropoff]` ordinals. A single date yields the same value twice. */
function windowOrdinals(rentalWindow: string): [number, number] {
  const parts = parseRentalWindow(rentalWindow)
  if (!parts) return [Number.NaN, Number.NaN]
  return [ordinal(parts.fromMonth, parts.fromDay), ordinal(parts.toMonth, parts.toDay)]
}

export function bookingPickupOrdinal(b: BookingTuple): number {
  return windowOrdinals(b[4])[0]
}

/** Rental length in whole days — always at least 1, so same-day rentals still land in a band. */
export function bookingDurationDays(b: BookingTuple): number {
  const [pickup, dropoff] = windowOrdinals(b[4])
  if (Number.isNaN(pickup) || Number.isNaN(dropoff)) return 1
  return Math.max(1, dropoff - pickup)
}

/** First word of the vehicle name — "BMW X5 xDrive40i" → "BMW". */
export function bookingMake(b: BookingTuple): string {
  return b[2].split(' ')[0] ?? ''
}

/** Every make present in the given bookings, alphabetical — feeds the Vehicle make filter. */
export function bookingMakes(bookings: BookingTuple[]): string[] {
  return [...new Set(bookings.map(bookingMake).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

/** Offsets in days from `MOCK_TODAY`, inclusive at both ends. */
const PICKUP_OFFSETS: Record<Exclude<BookingPickupRange, 'any'>, [from: number, to: number]> = {
  next7: [0, 7],
  next14: [0, 14],
  next30: [0, 30],
  past7: [-7, 0],
  past30: [-30, 0],
}

export const EMPTY_BOOKING_LISTS: BookingLists = { upcoming: [], recent: [], schedule: [] }

export function allBookings(lists: BookingLists): BookingTuple[] {
  return [...lists.upcoming, ...lists.recent]
}

/** The set a tab draws from, before any filter is applied. */
export function bookingsForTab(tab: BookingTab, lists: BookingLists): BookingTuple[] {
  switch (tab) {
    case 'Today':
      return lists.upcoming.filter((b) => bookingPickupOrdinal(b) === MOCK_TODAY)
    case 'Recent activity':
      return lists.recent
    case 'Overdue':
      return allBookings(lists).filter((b) => BOOKING_OVERDUE_STATUSES.includes(b[7]))
    case 'Upcoming':
    default:
      return lists.upcoming
  }
}

/** Searchable fields — customer, reference, vehicle and plate, matching the search placeholder. */
function matchesSearch(b: BookingTuple, term: string): boolean {
  return [b[0], b[1], b[2], b[3]].some((field) => field.toLowerCase().includes(term))
}

function matchesDuration(b: BookingTuple, value: BookingFilters['durationBand']): boolean {
  if (value === 'Any') return true
  const band = BOOKING_DURATION_BANDS.find((d) => d.value === value)
  if (!band) return true
  const days = bookingDurationDays(b)
  return days >= band.min && days <= band.max
}

/** Bands are OR-ed — selecting two means "in either". Refunds compare on their absolute value. */
function matchesValueBands(b: BookingTuple, values: BookingFilters['valueBands']): boolean {
  if (values.length === 0) return true
  const total = Math.abs(parseBookingTotal(b[8]))
  return values.some((value) => {
    const band = BOOKING_VALUE_BANDS.find((v) => v.value === value)
    return band ? total >= band.min && total < band.max : false
  })
}

function matchesPickup(b: BookingTuple, range: BookingPickupRange): boolean {
  if (range === 'any') return true
  const [from, to] = PICKUP_OFFSETS[range]
  const pickup = bookingPickupOrdinal(b)
  if (Number.isNaN(pickup)) return false
  return pickup >= MOCK_TODAY + from && pickup <= MOCK_TODAY + to
}

export function filterBookings(bookings: BookingTuple[], f: BookingFilters): BookingTuple[] {
  const term = f.search.trim().toLowerCase()

  return bookings.filter((b) => {
    if (term && !matchesSearch(b, term)) return false
    if (f.status !== 'Any' && b[7] !== f.status) return false
    if (f.location !== 'All' && b[6] !== f.location) return false
    if (f.make !== 'All' && bookingMake(b) !== f.make) return false
    if (!matchesPickup(b, f.pickup)) return false
    if (!matchesDuration(b, f.durationBand)) return false
    if (!matchesValueBands(b, f.valueBands)) return false
    return true
  })
}
