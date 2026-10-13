import { EMPTY_DATE_RANGE } from '@/components/ui/date-range-picker'
import type { CalendarStatus, CalendarView } from '../types/booking-calendar.types'
import type { BookingFilters, BookingTab } from '../types/booking.types'

/** Spacing of the pickup and return time slots, and what a new booking's default rounds up to. */
export const BOOKING_TIME_STEP_MINUTES = 30

/** Mirrors DECLINE_MESSAGE_LENGTH in the API (app/modules/bookings/models.py). */
export const DECLINE_MESSAGE_MAX = 500

/** What the API answers a change of dates or vehicle it turns down with; words in `details.change.errors`. */
export const CHANGE_ERRORS = [
  'not_before_pickup',
  'booking_cancelled',
  'vehicle_unavailable',
  'vehicle_archived',
  'vehicle_not_found',
  'vehicle_removed',
  'vehicle_has_no_rates',
  'window_not_ordered',
  'return_in_past',
  'rental_too_long',
  'nothing_changed',
  'quote_changed',
  'payment_processing',
] as const

export type ChangeError = (typeof CHANGE_ERRORS)[number]

/** Mirror the API's condition limits (app/modules/bookings/schemas.py and models.py). */
export const CONDITION_NOTES_MAX = 2000
export const MAX_CONDITION_PHOTO_BYTES = 10 * 1024 * 1024
export const MAX_CONDITION_PHOTOS_PER_STAGE = 20
/** No HEIC: these are shown as uploaded, and only Safari can draw one. */
export const CONDITION_PHOTO_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp']

/** The Drafts tab sits beside the booking tabs but draws from its own resource. */
export const DRAFTS_TAB = 'Drafts'

/** Nothing narrowed: the whole book, for a list that filters on one thing of its own. */
export const NO_BOOKING_FILTERS: BookingFilters = {
  search: '',
  status: 'Any',
  location: 'All',
  pickup: EMPTY_DATE_RANGE,
  make: 'All',
  durationBand: 'Any',
  valueBands: [],
}

/** A month is the widest view that still shows each rental as its own bar. */
export const DEFAULT_CALENDAR_VIEW: CalendarView = 'month'

/** Off until asked for: a cancelled booking holds no car, so it would only crowd the rows. */
export const CALENDAR_HIDDEN_BY_DEFAULT: readonly CalendarStatus[] = ['Cancelled']

/** Shown while the counts load, so the tabs render without flickering through zero. */
export const EMPTY_TAB_COUNTS: Record<BookingTab, number> = {
  All: 0,
  Upcoming: 0,
  Today: 0,
  Overdue: 0,
}
