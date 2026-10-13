import { useOrganizationStore } from '@/state/organization.store'

const DAY_MS = 86_400_000

function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * The zone booking times are read and entered in: the company's, wherever the staff sit, so
 * the counter, the renter and every document name the same hour.
 */
export function companyTimeZone(): string {
  return useOrganizationStore.getState().membership?.timezone ?? browserTimeZone()
}

/** The zone's clock at an instant, read as if it were UTC, in milliseconds. */
function wallClock(instant: number, zone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(instant)
      .map((part) => [part.type, Number(part.value)]),
  )
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
}

/**
 * The instant the company's clock shows `date` (`YYYY-MM-DD`) and `time` (`HH:mm`). An hour the
 * clocks repeat is taken as the first of the two, and one they skip is invalid: both as the API
 * treats a renter's booking.
 */
export function zonedInstant(date: string, time: string, zone = companyTimeZone()): Date {
  const wall = Date.parse(`${date}T${time || '00:00'}:00Z`)
  if (Number.isNaN(wall)) return new Date(NaN)
  // The offsets on either side of any clock change near this time.
  const candidates = [wall - DAY_MS, wall + DAY_MS].map((near) => wall - (wallClock(near, zone) - near))
  const real = candidates.filter((instant) => wallClock(instant, zone) === wall)
  return new Date(real.length > 0 ? Math.min(...real) : NaN)
}

/**
 * An instant as a Date whose UTC fields (`getUTCHours()`, `getUTCDate()`...) read the company's
 * clock, for filling date and time inputs. UTC because it skips no hour, as this browser's own
 * zone may. Not an instant any more: never send it or compare it to one.
 */
export function companyWall(at: Date | string | number, zone = companyTimeZone()): Date {
  return new Date(wallClock(new Date(at).getTime(), zone))
}

/**
 * An instant as a Date whose *local* fields read the company's clock, for a grid laid out with
 * local-date maths (the calendar, the availability strip). An hour this browser's own zone skips
 * lands an hour on: fine for where a bar is drawn, wrong for a value to submit (`companyWall`).
 */
export function companyLocal(at: Date | string | number, zone = companyTimeZone()): Date {
  const wall = companyWall(at, zone)
  return new Date(
    wall.getUTCFullYear(),
    wall.getUTCMonth(),
    wall.getUTCDate(),
    wall.getUTCHours(),
    wall.getUTCMinutes(),
    wall.getUTCSeconds(),
  )
}

/**
 * A `companyWall` time moved on, `stepMinutes` at a time, past any hour the clocks skip: a
 * default landing there would be refused the moment it was submitted. Others come back as given.
 */
export function realWall(wall: Date, stepMinutes: number, zone = companyTimeZone()): Date {
  const at = new Date(wall)
  const skipped = () =>
    Number.isNaN(zonedInstant(at.toISOString().slice(0, 10), at.toISOString().slice(11, 16), zone).getTime())
  // No zone skips more than a few hours, so a day of steps only ever ends early.
  for (let moved = 0; moved < 1440 && skipped(); moved += stepMinutes) {
    at.setUTCMinutes(at.getUTCMinutes() + stepMinutes)
  }
  return at
}

/** The instant a point on a `companyLocal` grid stands for, to ask the API about that stretch of it. */
export function instantOfCompanyLocal(local: Date, zone = companyTimeZone()): Date {
  const wall = realWall(
    new Date(
      Date.UTC(local.getFullYear(), local.getMonth(), local.getDate(), local.getHours(), local.getMinutes()),
    ),
    30,
    zone,
  )
  return zonedInstant(wall.toISOString().slice(0, 10), wall.toISOString().slice(11, 16), zone)
}

/** The calendar day (`YYYY-MM-DD`) an instant falls on at the company. */
export function companyDay(at: Date | string | number, zone = companyTimeZone()): string {
  return companyWall(at, zone).toISOString().slice(0, 10)
}

/** Hours between two instants as the company's clock counts them, so a clock change adds none. */
export function wallClockHours(from: Date | string, to: Date | string, zone = companyTimeZone()): number {
  return (wallClock(new Date(to).getTime(), zone) - wallClock(new Date(from).getTime(), zone)) / 3_600_000
}

/** The zone's short name at an instant, e.g. "EDT". English in every language: Spanish says "GMT-4". */
export function zoneName(at: Date | string | number, zone = companyTimeZone()): string {
  return (
    new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' })
      .formatToParts(new Date(at))
      .find((part) => part.type === 'timeZoneName')?.value ?? ''
  )
}

/** True when this browser's clock reads differently from the company's at `at`: now, by default. */
export function awayFromCompanyTime(at = Date.now(), zone = companyTimeZone()): boolean {
  return wallClock(at, zone) !== wallClock(at, browserTimeZone())
}
