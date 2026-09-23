import {
  BOOKING_DURATION_BANDS,
  BOOKING_OVERDUE_STATUSES,
  BOOKING_VALUE_BANDS,
  type BookingFilters,
  type BookingLists,
  type BookingSort,
  type BookingTab,
  type BookingTuple,
} from '../types/booking.types'
import type { DateRange } from '@/components/ui/date-range-picker'
import { parseRentalWindow } from './booking.schedule'
import { parseBookingTotal } from './booking.utils'

/**
 * A month·day ordinal — enough to diff two dates and compare against "today" without a year,
 * which is all a tuple's "Sep 14 · 09:30 → Sep 18" window carries. A rental this time next
 * year reads as today; that goes away with the tuple. Availability checks need genuine
 * timestamps and use booking.schedule.ts instead.
 */
function ordinal(month: number, day: number): number {
  return month * 31 + day
}

export function todayOrdinal(now = new Date()): number {
  return ordinal(now.getMonth(), now.getDate())
}

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

export const EMPTY_BOOKING_LISTS: BookingLists = { upcoming: [], recent: [], schedule: [] }

export function allBookings(lists: BookingLists): BookingTuple[] {
  return [...lists.upcoming, ...lists.recent]
}

/** The set a tab draws from, before any filter is applied. */
export function bookingsForTab(tab: BookingTab, lists: BookingLists): BookingTuple[] {
  switch (tab) {
    case 'Today':
      return lists.upcoming.filter((b) => bookingPickupOrdinal(b) === todayOrdinal())
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

/** `YYYY-MM-DD` → the same month·day ordinal the seeded windows produce. */
function dateOrdinal(value: string): number {
  const [, month, day] = value.split('-').map(Number)
  if (!month || !day) return Number.NaN
  return ordinal(month - 1, day)
}

/**
 * Inclusive at both ends, and blank on either side means unbounded there. Compared on month·day
 * only, so a span crossing new year won't behave — the seeded windows carry no year to compare
 * against. Revisit once bookings come from an API with real dates.
 */
function matchesPickup(b: BookingTuple, range: DateRange): boolean {
  if (!range.from && !range.to) return true
  const pickup = bookingPickupOrdinal(b)
  if (Number.isNaN(pickup)) return false
  if (range.from && pickup < dateOrdinal(range.from)) return false
  if (range.to && pickup > dateOrdinal(range.to)) return false
  return true
}

/**
 * References are issued in order ("BK-48210" then "BK-48211"), so their number stands in for a
 * created-at the tuples don't carry. Swap for the real timestamp once bookings come from the API.
 */
function bookingSequence(b: BookingTuple): number {
  const digits = b[1].replace(/\D/g, '')
  return digits ? Number(digits) : 0
}

/**
 * Ordered copy — never in place, since the caller's array is the query cache's own data.
 * Refunds sort on their signed total, so a credit sits at the bottom of a high-to-low list
 * rather than masquerading as a large booking.
 */
export function sortBookings(bookings: BookingTuple[], sort: BookingSort): BookingTuple[] {
  const sorted = [...bookings]

  switch (sort) {
    case 'oldest':
      return sorted.sort((a, b) => bookingSequence(a) - bookingSequence(b))
    case 'pickupAsc':
      return sorted.sort((a, b) => bookingPickupOrdinal(a) - bookingPickupOrdinal(b))
    case 'pickupDesc':
      return sorted.sort((a, b) => bookingPickupOrdinal(b) - bookingPickupOrdinal(a))
    case 'totalDesc':
      return sorted.sort((a, b) => parseBookingTotal(b[8]) - parseBookingTotal(a[8]))
    case 'totalAsc':
      return sorted.sort((a, b) => parseBookingTotal(a[8]) - parseBookingTotal(b[8]))
    case 'newest':
    default:
      return sorted.sort((a, b) => bookingSequence(b) - bookingSequence(a))
  }
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
