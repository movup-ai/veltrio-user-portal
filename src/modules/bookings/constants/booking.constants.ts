import type { BookingTab } from '../types/booking.types'

/** Spacing of the pickup and return time slots, and what a new booking's default rounds up to. */
export const BOOKING_TIME_STEP_MINUTES = 30

/** Mirrors DECLINE_MESSAGE_LENGTH in the API (app/modules/bookings/models.py). */
export const DECLINE_MESSAGE_MAX = 500

/** Mirror the API's condition limits (app/modules/bookings/schemas.py and models.py). */
export const CONDITION_NOTES_MAX = 2000
export const MAX_CONDITION_PHOTO_BYTES = 10 * 1024 * 1024
export const MAX_CONDITION_PHOTOS_PER_STAGE = 20
/** No HEIC: these are shown as uploaded, and only Safari can draw one. */
export const CONDITION_PHOTO_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp']

/** The Drafts tab sits beside the booking tabs but draws from its own resource. */
export const DRAFTS_TAB = 'Drafts'

/** Shown while the counts load, so the tabs render without flickering through zero. */
export const EMPTY_TAB_COUNTS: Record<BookingTab, number> = {
  All: 0,
  Upcoming: 0,
  Today: 0,
  Overdue: 0,
}
