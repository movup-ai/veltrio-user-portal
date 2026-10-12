import { BOOKING_TIME_STEP_MINUTES } from '../constants/booking.constants'

const MS_PER_MINUTE = 60_000

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** `<input type="date">` wants YYYY-MM-DD in *local* time — toISOString() would shift the day. */
export function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * A new booking's trip: pickup at the next time slot from `now`, back the same time a day
 * later — a one-day rental, the most common booking, and an exact match for a daily rate.
 * `now` is the company's clock in the Date's UTC fields (`companyWall`), where no hour is skipped.
 */
export function defaultTripWindow(now: Date) {
  // Rounded in wall-clock minutes: epoch-aligned slots land on :15 in a +05:45 zone.
  const minutes =
    now.getUTCHours() * 60 +
    now.getUTCMinutes() +
    (now.getUTCSeconds() * 1000 + now.getUTCMilliseconds()) / MS_PER_MINUTE
  const slot = Math.ceil(minutes / BOOKING_TIME_STEP_MINUTES) * BOOKING_TIME_STEP_MINUTES
  // Date.UTC carries minutes past midnight into the next day.
  const pickup = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, slot))
  const dropoff = new Date(pickup)
  dropoff.setUTCDate(dropoff.getUTCDate() + 1)
  const input = (at: Date) => ({ date: at.toISOString().slice(0, 10), time: at.toISOString().slice(11, 16) })
  return {
    pickupDate: input(pickup).date,
    pickupTime: input(pickup).time,
    returnDate: input(dropoff).date,
    returnTime: input(dropoff).time,
  }
}
