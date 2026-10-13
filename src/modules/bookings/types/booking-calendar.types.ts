import type { Booking } from './booking.types'

/** Labels live in `bookings:calendar.views.<value>`. */
export const CALENDAR_VIEWS = ['day', 'week', 'month', 'year'] as const
export type CalendarView = (typeof CALENDAR_VIEWS)[number]

/** The three views that draw one row per vehicle; `year` is an overview of its own. */
export type TimelineView = Exclude<CalendarView, 'year'>

/** Sunday or Monday, as the viewer's locale has it. */
export type WeekStart = 0 | 1

/** Half-open: `to` is the first instant after the span. */
export interface CalendarRange {
  from: Date
  to: Date
}

/** One hour of a day, or one day of a week or month. Half-open, like the range. */
export interface CalendarColumn {
  start: Date
  end: Date
}

/**
 * The statuses the legend toggles, in lifecycle order. `Ready` is derived, and a declined
 * request answers to `Cancelled`, which is what the API calls both.
 */
export const CALENDAR_STATUSES = [
  'Pending',
  'Confirmed',
  'Ready',
  'On rental',
  'Overdue',
  'Returned',
  'Completed',
  'Cancelled',
] as const
export type CalendarStatus = (typeof CALENDAR_STATUSES)[number]

/** A row's car. Built from the fleet, or from the booking's own copy once the car is gone. */
export interface CalendarVehicle {
  /** The vehicle id, or a name-and-plate key for a car that was deleted. */
  key: string
  /** Absent once the car is deleted: there is no page left to open. */
  id?: string
  name: string
  plate: string
  location?: string
  image?: string
}

export interface CalendarBar {
  booking: Booking
  /** What the bar is coloured by: the status, `Ready`, or `Declined`. */
  status: string
  /** Fractions of the track's width, clamped to the window. */
  start: number
  end: number
  /** The rental runs past that edge of the window, so the bar is cut off square there. */
  startsBefore: boolean
  endsAfter: boolean
  /** Bars that overlap on one car stack: 0 is the top lane. */
  lane: number
}

/** How a status is drawn, on a bar and on its legend entry alike. */
export interface CalendarLook {
  fill: string
  text: string
  /** The status's one strong colour, which fills its legend square. */
  accent: string
  /** A dashed edge, for a request that holds no car yet. */
  outlined: boolean
}

export interface CalendarRow {
  vehicle: CalendarVehicle
  bars: CalendarBar[]
  /** Lanes the row needs, at least one so an idle car still has a height. */
  lanes: number
}

export interface CalendarFilters {
  search: string
  location: string | 'All'
  /** Legend entries switched off. */
  hidden: ReadonlySet<CalendarStatus>
}

/** One month of the year overview: its days behind the blanks that align the first weekday. */
export interface CalendarMonth {
  start: Date
  cells: (Date | null)[]
}
