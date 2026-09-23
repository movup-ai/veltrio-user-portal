import type { BookedInterval } from '../types/booking.types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Time a seeded window falls back to when it doesn't spell one out. */
const DEFAULT_HOUR = 9

export interface RentalWindowParts {
  fromMonth: number
  fromDay: number
  fromHour: number
  fromMinute: number
  toMonth: number
  toDay: number
}

/** Matches "Sep 14" and "Sep 14 · 09:30" — the two shapes a rental window's endpoints take. */
const WINDOW_ENDPOINT = /([A-Z][a-z]{2})\s+(\d{1,2})(?:\s*·\s*(\d{1,2}):(\d{2}))?/g

/**
 * Pulls the endpoints out of a formatted window like "Sep 14 · 09:30 → Sep 18". Shared with
 * booking.filters.ts so the two readers of this string can't drift apart.
 */
export function parseRentalWindow(rentalWindow: string): RentalWindowParts | null {
  const matches = [...rentalWindow.matchAll(WINDOW_ENDPOINT)]
  if (matches.length === 0) return null

  const first = matches[0]
  const last = matches[matches.length - 1]
  const fromMonth = MONTHS.indexOf(first[1])
  const toMonth = MONTHS.indexOf(last[1])
  if (fromMonth === -1 || toMonth === -1) return null

  return {
    fromMonth,
    fromDay: Number(first[2]),
    fromHour: first[3] ? Number(first[3]) : DEFAULT_HOUR,
    fromMinute: first[4] ? Number(first[4]) : 0,
    toMonth,
    toDay: Number(last[2]),
  }
}

/**
 * Seeded windows carry no year, so they're pinned to `year` — that way the mock fleet has a
 * plausible book of business whenever the app is run. The return inherits the pickup's clock
 * time (rentals come back at the hour they went out), and a window that wraps new year rolls
 * its end date forward.
 */
export function rentalWindowDates(rentalWindow: string, year = new Date().getFullYear()): { from: Date; to: Date } | null {
  const parts = parseRentalWindow(rentalWindow)
  if (!parts) return null

  const from = new Date(year, parts.fromMonth, parts.fromDay, parts.fromHour, parts.fromMinute)
  let to = new Date(year, parts.toMonth, parts.toDay, parts.fromHour, parts.fromMinute)
  if (to <= from) to = new Date(year + 1, parts.toMonth, parts.toDay, parts.fromHour, parts.fromMinute)

  return { from, to }
}

/**
 * Half-open comparison: a rental ending exactly when the next begins is not a clash. No
 * turnaround buffer is applied — add one here if the business wants cleaning time enforced.
 */
export function intervalsOverlap(aFrom: string, aTo: string, bFrom: string, bTo: string): boolean {
  return Date.parse(aFrom) < Date.parse(bTo) && Date.parse(bFrom) < Date.parse(aTo)
}

/** Every booking on this vehicle that clashes with the requested window, earliest first. */
export function conflictsForVehicle(
  schedule: BookedInterval[],
  vehicleId: string,
  from: string,
  to: string,
): BookedInterval[] {
  return schedule
    .filter((i) => i.vehicleId === vehicleId && intervalsOverlap(from, to, i.from, i.to))
    .sort((a, b) => Date.parse(a.from) - Date.parse(b.from))
}

/** Just this plate's intervals — what the availability strip needs to shade its days. */
export function intervalsForPlate(schedule: BookedInterval[], plate: string): BookedInterval[] {
  return schedule.filter((i) => i.plate === plate)
}
