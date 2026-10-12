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
 * clocks repeat is taken as the first of the two, the choice the API makes for a renter's booking.
 */
export function zonedInstant(date: string, time: string, zone = companyTimeZone()): Date {
  const wall = Date.parse(`${date}T${time || '00:00'}:00Z`)
  if (Number.isNaN(wall)) return new Date(NaN)
  // The offsets on either side of any clock change near this time.
  const candidates = [wall - DAY_MS, wall + DAY_MS].map((near) => wall - (wallClock(near, zone) - near))
  const real = candidates.filter((instant) => wallClock(instant, zone) === wall)
  return new Date(real.length > 0 ? Math.min(...real) : candidates[0])
}

/**
 * An instant as a Date whose own fields (`getHours()`, `getDate()`...) read the company's clock,
 * for filling date and time inputs. Not an instant any more: never send it or compare it to one.
 */
export function companyWall(at: Date | string | number, zone = companyTimeZone()): Date {
  const wall = new Date(wallClock(new Date(at).getTime(), zone))
  return new Date(
    wall.getUTCFullYear(),
    wall.getUTCMonth(),
    wall.getUTCDate(),
    wall.getUTCHours(),
    wall.getUTCMinutes(),
    wall.getUTCSeconds(),
  )
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

/** True when this browser's clock reads differently from the company's right now. */
export function awayFromCompanyTime(now = Date.now(), zone = companyTimeZone()): boolean {
  return wallClock(now, zone) !== wallClock(now, browserTimeZone())
}
