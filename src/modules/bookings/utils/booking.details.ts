import { CUSTOMERS } from '@/modules/customers/mock/customer.mock'
import { MOCK_BRANCHES } from '@/modules/locations/mock/location.mock'
import { VEHICLES_SEED } from '@/modules/vehicles/mock/vehicle.mock'
import type { Vehicle } from '@/modules/vehicles/types/vehicle.types'
import {
  BOOKING_STAGES,
  type Booking,
  type BookingChargeLine,
  type BookingCheckStep,
  type BookingDetails,
  type BookingEventEntry,
  type BookingRenter,
  type BookingStage,
  type BookingStageStep,
  type BookingTuple,
} from '../types/booking.types'
import { parseBookingTotal } from './booking.utils'
import { rentalWindowDates } from './booking.schedule'

/** Fallbacks for a booking whose vehicle isn't in the fleet seed. */
const DEFAULT_TAX_PCT = 7
const DEFAULT_MILES_PER_DAY = 150

/** Terms revision in force. Stamped on the booking so an old one reads against its own terms. */

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

/** Digits of "BK-48210" — a stable number to vary the seeded flavour by, not a real identifier. */
function sequence(reference: string): number {
  return Number(reference.replace(/\D/g, '')) || 0
}

function findVehicle(plate: string): Vehicle | undefined {
  return VEHICLES_SEED.find((v) => v.plate === plate)
}

/**
 * How long the rental ran once the car is back, from the recorded handovers; until then, how
 * long it is booked for. To the minute: rounded to hours, 4h 30m read as five.
 */
export function rentalDuration(
  booked: { from: Date; to: Date },
  pickedUpAt?: string,
  returnedAt?: string,
): BookingDetails['duration'] {
  const ran = pickedUpAt && returnedAt
  const from = ran ? new Date(pickedUpAt) : booked.from
  const to = ran ? new Date(returnedAt) : booked.to
  const minutes = Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60_000))
  return { days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60), minutes: minutes % 60 }
}

/** What is recorded about how far a rental got. Only the status and the schedule are always known. */
export interface StageFacts {
  status: string
  /** The schedule: when pickup and return fall due, whether or not they have happened. */
  pickupAt: string
  returnAt: string
  createdAt?: string
  confirmedAt?: string
  pickedUpAt?: string
  returnedAt?: string
  completedAt?: string
  channel?: BookingStageStep['channel']
}

/** Stages a status says are behind it, for a row with no timestamps to say so itself. */
const STAGES_BEHIND: Record<string, number> = {
  Pending: 1,
  Confirmed: 2,
  'On rental': 3,
  // Still out: the car is late, not back.
  Overdue: 3,
  Returned: 4,
  Completed: 5,
}

/**
 * The five progress steps, from what actually happened. A finished step carries when it
 * happened, if that was recorded; pickup and return still ahead carry when they fall due.
 * Nothing is dated from a guess, and a booking that ended early skips the rest.
 */
export function bookingStages(facts: StageFacts): BookingStageStep[] {
  const cancelled = facts.status === 'Cancelled'
  // A cancelled booking's status no longer says how far it got; only its timestamps do.
  const behind = cancelled ? 1 : (STAGES_BEHIND[facts.status] ?? 1)
  const done: Record<BookingStage, boolean> = {
    reserved: true,
    confirmed: facts.confirmedAt != null || behind >= 2,
    pickedUp: facts.pickedUpAt != null || behind >= 3,
    returned: facts.returnedAt != null || behind >= 4,
    closed: behind >= 5,
  }
  const happened: Record<BookingStage, string | undefined> = {
    reserved: facts.createdAt,
    confirmed: facts.confirmedAt,
    pickedUp: facts.pickedUpAt,
    returned: facts.returnedAt,
    closed: facts.completedAt,
  }
  const due: Partial<Record<BookingStage, string>> = { pickedUp: facts.pickupAt, returned: facts.returnAt }
  const current = cancelled ? undefined : BOOKING_STAGES.find((key) => !done[key])

  return BOOKING_STAGES.map((key): BookingStageStep => {
    if (done[key]) {
      return { key, state: 'done', at: happened[key], channel: key === 'reserved' ? facts.channel : undefined }
    }
    if (cancelled) return { key, state: 'skipped' }
    return { key, state: key === current ? 'current' : 'pending', at: due[key] }
  })
}

/**
 * Charge lines that add up to `total` exactly — the list, the stats and the CSV all read that
 * figure, so the breakdown has to reconcile to it rather than stand apart from it.
 *
 * The base line is billed at the vehicle's daily rate, which is what the Vehicle card above it
 * shows; whatever is left over lands in "Taxes & fees", where branch surcharges live alongside
 * sales tax. If the rate card alone would overshoot the total (an old booking, a negotiated
 * price), the base is derived from the total instead so the sum still holds.
 */
export function buildCharges(
  total: number,
  days: number,
  dailyRate: number,
  taxRatePct: number,
  extras: BookingChargeLine[],
): BookingChargeLine[] {
  const extrasTotal = extras.reduce((sum, line) => sum + line.amount, 0)
  const atListRate = dailyRate * days
  const headroom = total / (1 + taxRatePct / 100) - extrasTotal

  const base = Math.max(0, Math.round(atListRate <= headroom ? atListRate : headroom))
  const taxes = total - base - extrasTotal

  return [
    { key: 'baseRate', meta: { rate: days > 0 ? Math.round(base / days) : base, days }, amount: base },
    ...extras,
    { key: 'taxes', meta: { pct: taxRatePct }, amount: taxes },
  ]
}

/**
 * Money taken and money still held. The deposit is a separate pot from the rental charge — it's
 * authorized up front, sits untouched through the rental, and is only ever released or drawn on
 * at the end, so it never counts towards the balance.
 */
/**
 * Identity is taken at booking and the background check runs before the branch will confirm;
 * insurance is only chased in the run-up to handover.
 */
function buildChecks(stageIndex: number): BookingCheckStep[] {
  return [
    { key: 'background', done: stageIndex >= 2 },
    { key: 'identity', done: stageIndex >= 1 },
    { key: 'insurance', done: stageIndex >= 3 },
  ]
}

function buildEvents(
  reference: string,
  stages: BookingStageStep[],
  renter: BookingRenter,
  plate: string,
  agent: string,
  deposit: number,
  depositHeld: boolean,
): BookingEventEntry[] {
  const reservedAt = stages[0].at ?? new Date().toISOString()
  const confirmedAt = stages[1].at ?? reservedAt
  const reserved = new Date(reservedAt)

  // Offsets keep the trail from reading as one templated timestamp repeated down the card.
  const licenceAt = addMinutes(addDays(reserved, 1), 41)

  const events: BookingEventEntry[] = [
    { key: 'created', at: reservedAt, meta: { channel: 'web', actor: renter.name } },
    // Only once a hold actually exists — the payment card would otherwise contradict the trail.
    ...(depositHeld
      ? [
          {
            key: 'depositHold' as const,
            at: confirmedAt,
            meta: { amount: deposit, card: `Visa · ${4000 + (sequence(reference) % 1000)}` },
          },
        ]
      : []),
    { key: 'licenceUploaded', at: licenceAt.toISOString(), meta: { licence: renter.licenceNumber } },
    { key: 'confirmationSent', at: addMinutes(licenceAt, 1).toISOString(), meta: { channel: 'auto' } },
  ]

  // Only once the car is actually spoken for — before that there is nothing to assign.
  if (stages[1].state === 'done') {
    events.push({
      key: 'vehicleAssigned',
      at: addMinutes(addDays(reserved, 4), 467).toISOString(),
      meta: { plate, actor: agent },
    })
  }

  return events
}

/**
 * An API booking carries its renter. Their history (rental count, lifetime value) has no
 * endpoint yet, so it reads as this one booking. Seeded rows fall back to the customer seed,
 * or to a renter known only through this booking.
 */
function buildRenter(name: string, bookingTotal: number, booking?: Booking): BookingRenter {
  if (booking) {
    return {
      id: booking.customer.id,
      name: booking.customer.name,
      email: booking.customer.email,
      phone: booking.customer.phone,
      licenceNumber: booking.customer.licenceNumber,
      dateOfBirth: booking.customer.dateOfBirth,
      rentals: 1,
      lifetimeValue: booking.pricing.total,
      since: new Date(booking.createdAt).getFullYear(),
    }
  }

  const seeded = CUSTOMERS.find((c) => c[0] === name)
  if (seeded) {
    return {
      name,
      email: seeded[1],
      phone: seeded[2],
      licenceNumber: seeded[3],
      rentals: Number(seeded[4]) || 1,
      lifetimeValue: parseBookingTotal(seeded[5]),
      // The seed carries no join date; a rental a quarter is a fair reading of the counts.
      since: new Date().getFullYear() - Math.max(1, Math.ceil(Number(seeded[4]) / 4)),
    }
  }

  return {
    name,
    email: '',
    phone: '',
    licenceNumber: '',
    rentals: 1,
    lifetimeValue: bookingTotal,
    since: new Date().getFullYear(),
  }
}

/** The stored quote, line by line — it already sums to the total, so nothing is reconciled. */
export function exactCharges(booking: Booking): BookingChargeLine[] {
  const { pricing, rate, additionalDrivers, fees } = booking
  return [
    ...rate.lines.map((line) => ({
      key: 'baseRate' as const,
      label: line.label,
      meta: { rate: line.rate, count: line.count, cappedHours: line.cappedHours },
      amount: line.rate * line.count,
    })),
    ...(pricing.discount
      ? [
          {
            key: 'discount' as const,
            meta: { days: pricing.discount.minDays, pct: pricing.discount.percentOff },
            amount: -pricing.discount.amount,
          },
        ]
      : []),
    ...(additionalDrivers.length > 0
      ? [
          {
            key: 'additionalDriver' as const,
            meta: { count: additionalDrivers.length, rate: additionalDrivers[0].pricePerDay },
            amount: pricing.drivers,
          },
        ]
      : []),
    ...fees.map((fee) => ({ key: 'extraFee' as const, label: fee.label, amount: fee.amount })),
    { key: 'taxes', meta: { pct: pricing.taxRatePct }, amount: pricing.tax },
  ]
}

/**
 * Assembles everything the details page shows. With `booking` (an API booking), the window,
 * charges, deposit and renter are exact; without one — a seeded tuple — they're inferred from
 * the row's display text and the fleet, customer and branch seeds.
 *
 * `context` carries the real vehicle and branch when the caller has them, so a live booking
 * shows its actual photo, address and agent rather than whatever the seeds happen to hold.
 *
 * Mock scaffolding either way: the timeline and audit trail have no endpoints yet, so
 * they're derived from the status and the rental window.
 */
/** The real records behind a live booking, where the caller has fetched them. */
export interface BookingDetailsContext {
  vehicle?: Vehicle
  branch?: { address?: string; manager?: string }
}

export function buildBookingDetails(
  tuple: BookingTuple,
  booking?: Booking,
  context: BookingDetailsContext = {},
): BookingDetails {
  const [customerName, reference, vehicleName, plate, window, , location, status, totalText] = tuple

  const dates = booking
    ? { from: new Date(booking.pickupAt), to: new Date(booking.returnAt) }
    : rentalWindowDates(window)
  const pickup = dates ? dates.from : new Date()
  const dropoff = dates ? dates.to : addDays(pickup, 1)
  const days = Math.max(1, Math.round((dropoff.getTime() - pickup.getTime()) / 86_400_000))

  // The live records where the caller fetched them; the seeds are the fallback for the
  // dashboard's mock rows, which have no real vehicle or branch behind them.
  const vehicle = context.vehicle ?? findVehicle(plate)
  const branch = context.branch ?? MOCK_BRANCHES.find((b) => b.name === location)
  const total = booking ? booking.pricing.total : Math.abs(parseBookingTotal(totalText))
  const taxRatePct = booking?.pricing.taxRatePct ?? vehicle?.fees.taxRatePct ?? DEFAULT_TAX_PCT

  const stages = bookingStages({
    status,
    pickupAt: pickup.toISOString(),
    returnAt: dropoff.toISOString(),
    createdAt: booking?.createdAt,
    confirmedAt: booking?.confirmedAt,
    pickedUpAt: booking?.pickedUpAt,
    returnedAt: booking?.returnedAt,
    completedAt: booking?.completedAt,
    // Only a renter booking for themselves states how they would like to pay.
    channel: booking ? (booking.paymentPreference ? 'web' : 'counter') : undefined,
  })
  // Counted from the stages, so the placeholder checks cannot disagree with the progress strip.
  const stageIndex = stages.filter((stage) => stage.state === 'done').length
  const renter = buildRenter(customerName, total, booking)
  const agent = branch?.manager ?? ''
  const deposit = booking?.pricing.deposit ?? vehicle?.fees.deposit ?? 350
  const rateOption = vehicle?.rateOptions.find((o) => o.basis === 'day')
  const listDailyRate =
    booking && booking.rate.basis === 'day'
      ? booking.rate.rate
      : (rateOption?.rate ?? Math.round(total / days))
  // Held on its own, or with the rental paid; the seeded rows have no payment, so their status says.
  const depositHeld = booking
    ? booking.payment.state === 'deposit_held' || booking.payment.state === 'paid'
    : status === 'Completed'

  const includedMiles = booking
    ? booking.rate.includedMiles
    : (rateOption?.includedMiles ?? DEFAULT_MILES_PER_DAY) * days

  return {
    reference,
    status,
    stages,

    pickupAt: pickup.toISOString(),
    returnAt: dropoff.toISOString(),
    pickupLocation: location,
    pickupAddress: branch?.address ?? '',
    returnLocation: booking?.returnLocation ?? location,
    returnSameBranch: (booking?.returnLocation ?? location) === location,
    pickedUpAt: booking?.pickedUpAt,
    returnedAt: booking?.returnedAt,
    days,
    // The real length: `days` above is rounded, for the charge lines.
    duration: rentalDuration({ from: pickup, to: dropoff }, booking?.pickedUpAt, booking?.returnedAt),
    includedMiles,

    vehicleId: booking?.vehicleId ?? vehicle?.id,
    vehicleName,
    vehiclePlate: plate,
    vehicleImage: vehicle?.photos[0]?.url,
    vehicleSubtitle: vehicle ? `${vehicle.vehicleType} · ${vehicle.year} · ${vehicle.location}` : location,
    listDailyRate,

    charges: booking ? exactCharges(booking) : buildCharges(total, days, listDailyRate, taxRatePct, []),
    total,
    checks: buildChecks(stageIndex),
    events: buildEvents(reference, stages, renter, plate, agent, deposit, depositHeld),
    renter,
    // A prompt to answer the reservation, so it goes once that is done. Counter bookings carry neither.
    request:
      status === 'Pending' && (booking?.paymentPreference || booking?.notes)
        ? { paymentPreference: booking.paymentPreference, notes: booking.notes }
        : undefined,
    declined: booking?.declined,
  }
}
