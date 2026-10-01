import { BOOKING_TIME_STEP_MINUTES } from '../constants/booking.constants'

const MS_PER_MINUTE = 60_000

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** `<input type="date">` wants YYYY-MM-DD in *local* time — toISOString() would shift the day. */
export function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function toTimeInput(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * A new booking's trip: pickup at the next time slot from `now`, back the same time a day
 * later — a one-day rental, the most common booking, and an exact match for a daily rate.
 */
export function defaultTripWindow(now: Date) {
  // Rounded in local wall-clock minutes: epoch-aligned slots land on :15 in a +05:45 zone.
  const minutes =
    now.getHours() * 60 + now.getMinutes() + (now.getSeconds() * 1000 + now.getMilliseconds()) / MS_PER_MINUTE
  const slot = Math.ceil(minutes / BOOKING_TIME_STEP_MINUTES) * BOOKING_TIME_STEP_MINUTES
  // The Date constructor carries minutes past midnight into the next day.
  const pickup = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, slot)
  const dropoff = new Date(pickup)
  // setDate rather than +24h, so a clock change overnight still returns at the same wall time.
  dropoff.setDate(dropoff.getDate() + 1)
  return {
    pickupDate: toDateInput(pickup),
    pickupTime: toTimeInput(pickup),
    returnDate: toDateInput(dropoff),
    returnTime: toTimeInput(dropoff),
  }
}
