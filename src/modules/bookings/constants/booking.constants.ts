import type { BookingTab } from '../types/booking.types'

/** The Drafts tab sits beside the booking tabs but draws from its own resource. */
export const DRAFTS_TAB = 'Drafts'

/** Shown while the counts load, so the tabs render without flickering through zero. */
export const EMPTY_TAB_COUNTS: Record<BookingTab, number> = {
  Upcoming: 0,
  Today: 0,
  'Recent activity': 0,
  Overdue: 0,
}
