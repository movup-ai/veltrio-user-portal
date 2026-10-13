import { statusColors } from '@/components/data-display/status-colors'
import type { Vehicle } from '@/modules/vehicles/types/vehicle.types'
import { photoThumbnail } from '@/modules/vehicles/utils/vehicle.utils'
import { companyWall } from '@/utils/company-time'
import { DEFAULT_CALENDAR_VIEW } from '../constants/booking.constants'
import {
  CALENDAR_STATUSES,
  CALENDAR_VIEWS,
  type CalendarBar,
  type CalendarColumn,
  type CalendarFilters,
  type CalendarLook,
  type CalendarMonth,
  type CalendarRange,
  type CalendarRow,
  type CalendarStatus,
  type CalendarVehicle,
  type CalendarView,
  type TimelineView,
  type WeekStart,
} from '../types/booking-calendar.types'
import { isReadyForPickup, type Booking } from '../types/booking.types'
import { badgeStatus } from './booking.utils'

/*
 * The grid's dates hold the company's clock in their UTC fields (`companyWall`), and all of its
 * date maths is done there: UTC has no clock changes, so this browser's own cannot bend the grid.
 */
const HOUR_MS = 3_600_000
const utcDate = (date: Date, month = date.getUTCMonth(), day = date.getUTCDate()) =>
  new Date(Date.UTC(date.getUTCFullYear(), month, day))
const startOfDay = (date: Date) => utcDate(date)
const startOfMonth = (date: Date) => utcDate(date, date.getUTCMonth(), 1)
const startOfYear = (date: Date) => utcDate(date, 0, 1)
const startOfWeek = (date: Date, weekStartsOn: WeekStart) =>
  addDays(startOfDay(date), -((date.getUTCDay() - weekStartsOn + 7) % 7))
const addHours = (date: Date, amount: number) => new Date(date.getTime() + amount * HOUR_MS)
const addDays = (date: Date, amount: number) => new Date(date.getTime() + amount * 24 * HOUR_MS)
const addWeeks = (date: Date, amount: number) => addDays(date, amount * 7)
const addYears = (date: Date, amount: number) => addMonths(date, amount * 12)
function addMonths(date: Date, amount: number): Date {
  const first = utcDate(date, date.getUTCMonth() + amount, 1)
  // The 31st of a shorter month is its last day, not a day or three into the next.
  const lastDay = utcDate(first, first.getUTCMonth() + 1, 0).getUTCDate()
  return new Date(
    addDays(first, Math.min(date.getUTCDate(), lastDay) - 1).getTime() + (date.getTime() % (24 * HOUR_MS)),
  )
}

/** The day (`YYYY-MM-DD`) a date on the grid stands for. */
export function calendarDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

const STEP: Record<CalendarView, (date: Date, amount: number) => Date> = {
  day: addDays,
  week: addWeeks,
  month: addMonths,
  year: addYears,
}

/** The span a view shows around `anchor`, on the company's clock like every other booking time. */
export function calendarRange(view: CalendarView, anchor: Date, weekStartsOn: WeekStart): CalendarRange {
  const from =
    view === 'day'
      ? startOfDay(anchor)
      : view === 'week'
        ? startOfWeek(anchor, weekStartsOn)
        : view === 'month'
          ? startOfMonth(anchor)
          : startOfYear(anchor)
  return { from, to: STEP[view](from, 1) }
}

export function shiftAnchor(view: CalendarView, anchor: Date, steps: number): Date {
  return STEP[view](anchor, steps)
}

/** "Wed, September 16, 2026", "Sep 13 – 19, 2026", "September 2026" or "2026". */
export function calendarTitle(view: CalendarView, range: CalendarRange, locale: string): string {
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' })
  if (view === 'day') {
    return format({ weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }).format(range.from)
  }
  if (view === 'week') {
    // Half-open: the week's last day is the one before `to`.
    const last = addDays(range.to, -1)
    return format({ month: 'short', day: 'numeric', year: 'numeric' }).formatRange(range.from, last)
  }
  if (view === 'month') return format({ month: 'long', year: 'numeric' }).format(range.from)
  return format({ year: 'numeric' }).format(range.from)
}

/** Hours of the day, or days of the week or month. Every day is 24: the grid keeps no clock changes. */
export function calendarColumns(view: TimelineView, range: CalendarRange): CalendarColumn[] {
  const step = view === 'day' ? addHours : addDays
  const columns: CalendarColumn[] = []
  for (let start = range.from; start < range.to;) {
    const end = step(start, 1)
    columns.push({ start, end })
    start = end
  }
  return columns
}

/**
 * Where an instant falls across the track, 0 to 1, or null outside it. Measured within its own
 * column: days are not all 24 hours long, so a fraction of the whole span drifts off the grid.
 */
export function timelineFraction(columns: CalendarColumn[], at: number): number | null {
  const index = columns.findIndex((c) => at >= c.start.getTime() && at < c.end.getTime())
  if (index === -1) return null
  const start = columns[index].start.getTime()
  const end = columns[index].end.getTime()
  return (index + (at - start) / (end - start)) / columns.length
}

function clampedFraction(columns: CalendarColumn[], at: number): number {
  if (at <= columns[0].start.getTime()) return 0
  return timelineFraction(columns, at) ?? 1
}

/** The status a bar is coloured by: `Ready` and `Declined` included, as on the bookings list. */
export function calendarStatus(booking: Booking, now: number): string {
  // Derived at the minute, as the API does: a page left open must not show a late car as on time.
  if (booking.status === 'On rental' && Date.parse(booking.returnAt) < now) return 'Overdue'
  return badgeStatus(booking.status, isReadyForPickup(booking), Boolean(booking.declined))
}

/** The legend entry a status answers to; undefined for one the portal does not know yet. */
function legendStatus(status: string): CalendarStatus | undefined {
  const entry = status === 'Declined' ? 'Cancelled' : status
  return CALENDAR_STATUSES.find((known) => known === entry)
}

/**
 * The bookings list's own badge colours, for the bars and the legend both: a status must not
 * change colour between the two pages. Only the dashed edge of a request is the calendar's own.
 */
export function calendarLook(status: string): CalendarLook {
  const { bg, fg } = statusColors(status)
  // A filled badge writes in white or near it, so there the fill is the colour that names it.
  const accent = fg.endsWith('-foreground)') ? bg : fg
  return { fill: bg, text: fg, accent, outlined: status === 'Pending' }
}

/**
 * Exactly the booked window, on the grid's clock. A car still out is not stretched to now: the
 * bar would then end where the booking does not, and its colour already says the rental is overdue.
 */
function bookingSpan(booking: Booking): { from: number; to: number } {
  return {
    from: companyWall(booking.pickupAt).getTime(),
    to: companyWall(booking.returnAt).getTime(),
  }
}

/** By id, never plate: plates are not unique. A deleted car has only its name and plate left. */
function vehicleKey(booking: Booking): string {
  return booking.vehicleId ?? `${booking.vehicleName}|${booking.vehiclePlate}`
}

function toBars(bookings: Booking[], columns: CalendarColumn[], now: number): CalendarBar[] {
  const windowFrom = columns[0].start.getTime()
  const windowTo = columns[columns.length - 1].end.getTime()
  const spans = bookings
    .map((booking) => ({ booking, ...bookingSpan(booking) }))
    .filter((span) => span.from < windowTo && span.to > windowFrom)
    .sort((a, b) => a.from - b.from || a.to - b.to)

  // A pending request holds nothing, so it can sit on dates a confirmed rental already has.
  const laneEnds: number[] = []
  return spans.map(({ booking, from, to }) => {
    let lane = laneEnds.findIndex((end) => end <= from)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = to
    return {
      booking,
      status: calendarStatus(booking, now),
      start: clampedFraction(columns, from),
      end: clampedFraction(columns, to),
      startsBefore: from < windowFrom,
      endsAfter: to > windowTo,
      lane,
    }
  })
}

/** Named as a booking names its car, so the search finds either by the same words. */
export function toCalendarVehicle(vehicle: Vehicle): CalendarVehicle {
  const cover = vehicle.photos[0]
  return {
    key: vehicle.id,
    id: vehicle.id,
    name: `${vehicle.make} ${vehicle.model}`,
    plate: vehicle.plate,
    location: vehicle.location,
    image: (cover && photoThumbnail(cover)) || undefined,
  }
}

/** One row per vehicle, idle ones included: the gaps are what the calendar is read for. */
export function calendarRows(
  vehicles: CalendarVehicle[],
  bookings: Booking[],
  columns: CalendarColumn[],
  now: number,
): CalendarRow[] {
  const byVehicle = new Map<string, Booking[]>()
  for (const booking of bookings) {
    const key = vehicleKey(booking)
    const sameCar = byVehicle.get(key)
    if (sameCar) sameCar.push(booking)
    else byVehicle.set(key, [booking])
  }

  const inFleet = new Set(vehicles.map((v) => v.key))
  // Archived or deleted since: the rental still happened, so it keeps a row after the fleet's.
  const gone: CalendarVehicle[] = [...byVehicle.entries()]
    .filter(([key]) => !inFleet.has(key))
    .map(([key, [first]]) => ({
      key,
      id: first.vehicleId,
      name: first.vehicleName,
      plate: first.vehiclePlate,
    }))

  const toRow = (vehicle: CalendarVehicle): CalendarRow => {
    const bars = toBars(byVehicle.get(vehicle.key) ?? [], columns, now)
    return { vehicle, bars, lanes: Math.max(1, ...bars.map((bar) => bar.lane + 1)) }
  }
  return [...vehicles.map(toRow), ...gone.map(toRow).filter((row) => row.bars.length > 0)]
}

/**
 * Narrows the fleet and the bookings together. A search that matches a car keeps all of its
 * rentals; one that matches a renter or reference keeps that rental and the car it is on.
 */
export function filterCalendar(
  vehicles: CalendarVehicle[],
  bookings: Booking[],
  filters: CalendarFilters,
  now: number,
): { vehicles: CalendarVehicle[]; bookings: Booking[] } {
  const inBranch =
    filters.location === 'All' ? vehicles : vehicles.filter((v) => v.location === filters.location)
  const branchKeys = new Set(inBranch.map((v) => v.key))

  let shown = bookings.filter((booking) => {
    const legend = legendStatus(calendarStatus(booking, now))
    if (legend && filters.hidden.has(legend)) return false
    // A car outside the fleet has no branch to match, so a branch filter leaves it out.
    return filters.location === 'All' || branchKeys.has(vehicleKey(booking))
  })

  const term = filters.search.trim().toLowerCase()
  if (!term) return { vehicles: inBranch, bookings: shown }

  const has = (...values: string[]) => values.some((value) => value.toLowerCase().includes(term))
  const matchedCars = new Set(inBranch.filter((v) => has(v.name, v.plate)).map((v) => v.key))
  shown = shown.filter(
    (b) => matchedCars.has(vehicleKey(b)) || has(b.customer.name, b.reference, b.vehicleName, b.vehiclePlate),
  )
  const booked = new Set(shown.map(vehicleKey))
  return {
    vehicles: inBranch.filter((v) => matchedCars.has(v.key) || booked.has(v.key)),
    bookings: shown,
  }
}

/** How many vehicles have a rental under way on each day of the range, keyed `YYYY-MM-DD`. */
export function bookedVehiclesByDay(bookings: Booking[], range: CalendarRange): Map<string, number> {
  const vehiclesByDay = new Map<string, Set<string>>()
  for (const booking of bookings) {
    const span = bookingSpan(booking)
    const until = Math.min(span.to, range.to.getTime())
    let day = startOfDay(new Date(Math.max(span.from, range.from.getTime())))
    // Half-open: a rental returned at midnight does not count towards the day that starts then.
    while (day.getTime() < until) {
      const key = calendarDay(day)
      vehiclesByDay.set(key, (vehiclesByDay.get(key) ?? new Set()).add(vehicleKey(booking)))
      day = addDays(day, 1)
    }
  }
  return new Map([...vehiclesByDay].map(([day, vehicles]) => [day, vehicles.size]))
}

/** 0 for an idle day, then a step per quarter of the fleet that is out. */
export function heatLevel(booked: number, fleetSize: number): 0 | 1 | 2 | 3 | 4 {
  if (booked <= 0) return 0
  // Rentals on cars since removed can outnumber the fleet; the share still tops out at all of it.
  const share = booked / Math.max(fleetSize, booked)
  return share > 0.75 ? 4 : share > 0.5 ? 3 : share > 0.25 ? 2 : 1
}

export function yearMonths(yearStart: Date, weekStartsOn: WeekStart): CalendarMonth[] {
  return Array.from({ length: 12 }, (_, index) => {
    const start = addMonths(yearStart, index)
    const blanks = (start.getUTCDay() - weekStartsOn + 7) % 7
    const days = calendarColumns('month', { from: start, to: addMonths(start, 1) }).map((c) => c.start)
    return { start, cells: [...Array<null>(blanks).fill(null), ...days] }
  })
}

/** `?view=` as typed into the address bar; anything else opens the default. */
export function parseCalendarView(value: string | null): CalendarView {
  return CALENDAR_VIEWS.find((view) => view === value) ?? DEFAULT_CALENDAR_VIEW
}

/** `?date=YYYY-MM-DD`. A day that does not exist (Feb 31) falls back rather than rolling over. */
export function parseCalendarDay(value: string | null, fallback: Date): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback
  const day = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(day.getTime()) && calendarDay(day) === value ? day : fallback
}
