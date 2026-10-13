import { MAX_RENTAL_DAYS } from '@/modules/vehicles/constants/rate-plan.constants'
import type { Vehicle } from '@/modules/vehicles/types/vehicle.types'
import { toCents } from '@/lib/money'
import { normalizeApiError } from '@/services/api/errors'
import { companyDay, companyWall, instantOfWall } from '@/utils/company-time'
import { BOOKING_TIME_STEP_MINUTES, CHANGE_ERRORS, type ChangeError } from '../constants/booking.constants'
import { combineDateTime } from '../schema/booking.schema'
import type { AdditionalDriver, BookedInterval, ChangeQuote, ChangeRequest } from '../types/booking.types'
import { ADDITIONAL_DRIVER_PER_DAY } from './booking.pricing'
import { toTimeInput } from './booking.trip-defaults'

const MS_PER_DAY = 86_400_000

/** A rental window as the four date and time fields hold it, in the branch's own clock. */
export interface TripChoice {
  pickupDate: string
  pickupTime: string
  returnDate: string
  returnTime: string
}

interface Window {
  pickupAt: string
  returnAt: string
}

/**
 * Where the dates dialog starts: the window the booking has. On the company's clock, as the
 * fields are read back: filled from this browser's, an untouched hour was saved as another.
 */
export function tripChoice({ pickupAt, returnAt }: Window): TripChoice {
  const [pickup, dropoff] = [companyWall(pickupAt).toISOString(), companyWall(returnAt).toISOString()]
  return {
    pickupDate: pickup.slice(0, 10),
    pickupTime: pickup.slice(11, 16),
    returnDate: dropoff.slice(0, 10),
    returnTime: dropoff.slice(11, 16),
  }
}

/** The instants a choice names, or undefined while a field is empty. */
export function chosenWindow(choice: TripChoice): Window | undefined {
  if (Object.values(choice).some((field) => !field)) return undefined
  const pickup = combineDateTime(choice.pickupDate, choice.pickupTime)
  const dropoff = combineDateTime(choice.returnDate, choice.returnTime)
  if (Number.isNaN(pickup.getTime()) || Number.isNaN(dropoff.getTime())) return undefined
  return { pickupAt: pickup.toISOString(), returnAt: dropoff.toISOString() }
}

type WindowProblem = 'notOrdered' | 'inPast' | 'tooLong'

/** Why a window cannot be asked for, checked here so the API is not asked to refuse it. */
export function windowProblem(window: Window, now: Date): WindowProblem | undefined {
  const [from, to] = [Date.parse(window.pickupAt), Date.parse(window.returnAt)]
  if (to <= from) return 'notOrdered'
  // Only the return: a pickup a little behind the clock is a renter already at the counter.
  if (to <= now.getTime()) return 'inPast'
  if (to - from > MAX_RENTAL_DAYS * MS_PER_DAY) return 'tooLong'
  return undefined
}

/**
 * The ends of the window that moved, or undefined when neither did. Compared as the fields
 * show them: a booking made to the second would otherwise read as moved by its own seconds.
 */
export function datesRequest(choice: TripChoice, booking: Window): ChangeRequest | undefined {
  const was = tripChoice(booking)
  const window = chosenWindow(choice)
  if (!window) return undefined
  const pickupMoved = choice.pickupDate !== was.pickupDate || choice.pickupTime !== was.pickupTime
  const returnMoved = choice.returnDate !== was.returnDate || choice.returnTime !== was.returnTime
  if (!pickupMoved && !returnMoved) return undefined
  return {
    ...(pickupMoved && { pickupAt: window.pickupAt }),
    ...(returnMoved && { returnAt: window.returnAt }),
  }
}

/**
 * Who holds a vehicle, from a schedule read for exactly the window in question. The API's word
 * is taken as it is: it lists a car still out past its dates, which comparing dates here misses.
 */
function holder(schedule: BookedInterval[], vehicleId: string, reference?: string) {
  return schedule.find((held) => held.vehicleId === vehicleId && held.reference !== reference)
}

/** The booking in the way on the booking's own vehicle; its own dates are not. */
export function windowClash(
  schedule: BookedInterval[],
  booking: { reference: string; vehicleId?: string },
): BookedInterval | undefined {
  return booking.vehicleId ? holder(schedule, booking.vehicleId, booking.reference) : undefined
}

/**
 * How far ahead a vehicle's rentals are read for the calendars: from the start of the company's
 * today, twice the longest rental. Days past that are not struck out; the API still refuses a
 * clash there.
 */
export function holdsWindow(now: Date): { from: string; to: string } {
  const today = companyWall(now)
  today.setUTCHours(0, 0, 0, 0)
  const from = instantOfWall(today)
  const to = new Date(from.getTime() + 2 * MAX_RENTAL_DAYS * MS_PER_DAY)
  return { from: from.toISOString(), to: to.toISOString() }
}

/** The other rentals on the booking's own vehicle: what its new dates have to fit between. */
export function otherHolds(
  schedule: BookedInterval[],
  booking: { reference: string; vehicleId?: string },
): BookedInterval[] {
  return schedule.filter(
    (held) => held.vehicleId === booking.vehicleId && held.reference !== booking.reference,
  )
}

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))

/** Every time of day the pickers offer, as `HH:mm`. */
const SLOTS = Array.from({ length: (24 * 60) / BOOKING_TIME_STEP_MINUTES }, (_, slot) =>
  toTimeInput(new Date(2000, 0, 1, 0, slot * BOOKING_TIME_STEP_MINUTES)),
)

/** Whether a pickup on this day at this time would land inside another rental. */
export function pickupBlocked(holds: BookedInterval[], date: string, time: string): boolean {
  const at = combineDateTime(date, time).getTime()
  return holds.some((held) => Date.parse(held.from) <= at && at < Date.parse(held.to))
}

/** Whether a return then is one the booking cannot have: not after its pickup, or into another rental. */
export function returnBlocked(
  holds: BookedInterval[],
  pickupAt: string,
  date: string,
  time: string,
): boolean {
  const [from, to] = [Date.parse(pickupAt), combineDateTime(date, time).getTime()]
  return to <= from || holds.some((held) => Date.parse(held.from) < to && from < Date.parse(held.to))
}

/**
 * The days with no hour left for a pickup, for a calendar to strike out. A day a rental only
 * partly covers stays: struck out by the hour, the two pickers would shut each other's way in.
 */
export function blockedPickupDays(holds: BookedInterval[]): string[] {
  const blocked = new Set<string>()
  for (const held of holds) {
    // The company's days, in the Date's UTC fields: the days the calendar itself shows.
    const day = companyWall(held.from)
    const until = companyWall(held.to).getTime()
    for (day.setUTCHours(0, 0, 0, 0); day.getTime() < until; day.setUTCDate(day.getUTCDate() + 1)) {
      const date = day.toISOString().slice(0, 10)
      if (SLOTS.every((time) => pickupBlocked(holds, date, time))) blocked.add(date)
    }
  }
  return [...blocked]
}

/**
 * The last day the return can fall on: the day the next rental after the pickup begins, up to
 * its hour. Undefined when nothing follows, so the calendar is open.
 */
export function lastReturnDay(holds: BookedInterval[], pickupAt: string): string | undefined {
  const pickup = Date.parse(pickupAt)
  const [next] = holds
    .filter((held) => Date.parse(held.to) > pickup)
    .sort((a, b) => Date.parse(a.from) - Date.parse(b.from))
  return next && companyDay(next.from)
}

/** The free time closest to `time`; `time` itself when it is free, or when nothing is. */
export function nearestFreeTime(time: string, blocked: (time: string) => boolean): string {
  if (!blocked(time)) return time
  const away = (slot: string) => Math.abs(minutesOf(slot) - minutesOf(time))
  const free = SLOTS.filter((slot) => !blocked(slot))
  return free.length > 0 ? free.reduce((best, slot) => (away(slot) < away(best) ? slot : best)) : time
}

/**
 * The choice with one end on another day. The hour comes along unless it is taken there, when
 * it moves to the nearest free one: a day just picked must not open on an hour it cannot have.
 */
export function withDate(
  choice: TripChoice,
  side: 'pickup' | 'return',
  date: string,
  holds: BookedInterval[],
): TripChoice {
  const moved = { ...choice, [`${side}Date`]: date }
  const pickupAt = combineDateTime(moved.pickupDate, moved.pickupTime).toISOString()
  const taken =
    side === 'pickup'
      ? (time: string) => pickupBlocked(holds, date, time)
      : (time: string) => returnBlocked(holds, pickupAt, date, time)
  return { ...moved, [`${side}Time`]: nearestFreeTime(moved[`${side}Time`], taken) }
}

/** Whether a rental's own dates ended by `at`: it holds the car because it is not back. */
export function stillOut(held: BookedInterval, at: string): boolean {
  return Date.parse(held.to) <= Date.parse(at)
}

/** In the workshop or off the road there is no telling when a car is back, so it is not offered. */
const SWAPPABLE: readonly Vehicle['status'][] = ['Available', 'On rent']

/**
 * The cars a booking could move to, those at its pickup branch first. A car out today counts:
 * what matters is the booking's dates. One held on them is still listed, with who holds it.
 */
export function swapOptions(
  vehicles: Vehicle[],
  schedule: BookedInterval[],
  booking: Window & { vehicleId?: string; pickupLocation: string },
): { vehicle: Vehicle; bookedUntil?: string; outOn?: string }[] {
  const elsewhere = (vehicle: Vehicle) => Number(vehicle.location !== booking.pickupLocation)
  return vehicles
    .filter((vehicle) => vehicle.id !== booking.vehicleId && SWAPPABLE.includes(vehicle.status))
    .sort((a, b) => elsewhere(a) - elsewhere(b))
    .map((vehicle) => {
      const held = holder(schedule, vehicle.id)
      if (!held) return { vehicle }
      return stillOut(held, booking.pickupAt)
        ? { vehicle, outOn: held.reference }
        : { vehicle, bookedUntil: held.to }
    })
}

/** What the change leaves between the renter and the company: an amount to pay, or one to refund. */
export function changeMoney(quote: Pick<ChangeQuote, 'balance' | 'overpaid'>) {
  if (quote.overpaid > 0) return { kind: 'toRefund' as const, amount: quote.overpaid }
  return { kind: 'toPay' as const, amount: quote.balance }
}

type ChangeEffect = 'agreement' | 'link' | 'hold' | 'refund' | 'noEmail'

/**
 * What the change leaves the counter to do, in the order it does it. The email that always
 * goes is not among them; one that cannot go is, since telling the renter is then the counter's.
 */
export function changeEffects(quote: ChangeQuote): ChangeEffect[] {
  return [
    quote.voidsAgreement && ('agreement' as const),
    quote.withdrawsLink && ('link' as const),
    quote.releasesDeposit && ('hold' as const),
    quote.overpaid > 0 && ('refund' as const),
    !quote.emailsRenter && ('noEmail' as const),
  ].filter((effect): effect is ChangeEffect => Boolean(effect))
}

/** Where the drivers dialog starts: the drivers the booking has, or one to fill in when it has none. */
export function startingDrivers(current: AdditionalDriver[], newId: () => string): AdditionalDriver[] {
  if (current.length > 0) return current
  return [{ id: newId(), name: '', licenceNumber: '', pricePerDay: ADDITIONAL_DRIVER_PER_DAY }]
}

/**
 * The drivers to ask for, or undefined while the list is as the booking has it. Compared as
 * the API will store them, so spaces around a name are not a change.
 */
export function driversRequest(
  drivers: AdditionalDriver[],
  current: AdditionalDriver[],
): ChangeRequest | undefined {
  // A rate cleared in its field reads as NaN: no charge, as the form's own schema takes it.
  const asked = drivers.map((driver) => ({ ...driver, pricePerDay: driver.pricePerDay || 0 }))
  const stored = (driver: AdditionalDriver) =>
    [driver.id, driver.name.trim(), driver.licenceNumber.trim(), toCents(driver.pricePerDay)].join('|')
  const same =
    asked.length === current.length && asked.every((driver, at) => stored(driver) === stored(current[at]))
  return same ? undefined : { additionalDrivers: asked }
}

/** The API's reason for refusing a quote or a change, where the dialogs have words for it. */
export function changeError(error: unknown): ChangeError | undefined {
  const { code } = normalizeApiError(error)
  return (CHANGE_ERRORS as readonly string[]).includes(code ?? '') ? (code as ChangeError) : undefined
}
