import { CUSTOMERS } from '@/modules/customers/mock/customer.mock'
import { MOCK_BRANCHES } from '@/modules/locations/mock/location.mock'
import { VEHICLES_SEED } from '@/modules/vehicles/mock/vehicle.mock'
import type { Vehicle } from '@/modules/vehicles/types/vehicle.types'
import {
  BOOKING_STAGES,
  type Booking,
  type BookingAgreement,
  type BookingChargeLine,
  type BookingCheckStep,
  type BookingDetails,
  type BookingEventEntry,
  type BookingPaymentState,
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

/** How far ahead of pickup a booking is taken, in the seeded data. */
const RESERVED_DAYS_BEFORE = 5

/** Terms revision in force. Stamped on the booking so an old one reads against its own terms. */
const AGREEMENT_VERSION = 'v3.2'

/**
 * How far along the rental is, by status. Index into BOOKING_STAGES: 1 means Reserved is behind
 * us and Confirmed is where things stand. Money problems hold a booking at Reserved — the branch
 * won't confirm a car it hasn't been paid a deposit for.
 */
const STAGE_INDEX: Record<string, number> = {
  'Deposit due': 1,
  'Awaiting ID': 1,
  'Payment failed': 1,
  Confirmed: 2,
  'Overdue fee': 4,
  Completed: 5,
  Refunded: 5,
}

/** Statuses where the money never landed, or came back out again. */
const UNSETTLED_STATUSES = ['Deposit due', 'Payment failed']

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
 * The five progress steps, dated. Stages behind the current one carry when they happened;
 * the ones ahead carry when they fall due, so the strip reads the same whether you're looking
 * back at a finished rental or forward at one that hasn't started.
 */
function buildStages(status: string, pickup: Date, dropoff: Date): BookingStageStep[] {
  const reached = STAGE_INDEX[status] ?? 1
  const reservedAt = addDays(pickup, -RESERVED_DAYS_BEFORE)

  const at: Record<BookingStage, Date | undefined> = {
    reserved: reservedAt,
    confirmed: addMinutes(reservedAt, 2),
    pickedUp: pickup,
    returned: dropoff,
    // Closing happens whenever the paperwork is finished — there is nothing to promise in advance.
    closed: reached >= BOOKING_STAGES.length ? addMinutes(dropoff, 45) : undefined,
  }

  const channel: Partial<Record<BookingStage, BookingStageStep['channel']>> = {
    reserved: 'web',
    confirmed: 'auto',
    pickedUp: 'counter',
    returned: 'counter',
    closed: 'auto',
  }

  return BOOKING_STAGES.map((key, index): BookingStageStep => {
    const state = index < reached ? 'done' : index === reached ? 'current' : 'pending'
    return { key, state, at: at[key]?.toISOString(), channel: index < reached ? channel[key] : undefined }
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
function buildPayment(
  status: string,
  total: number,
  deposit: number,
  card: string,
  capturedAt: string,
  finished: boolean,
): BookingPaymentState {
  const settled = !UNSETTLED_STATUSES.includes(status)
  const refunded = status === 'Refunded' ? total : 0
  const captured = settled ? total : 0

  const depositState: BookingPaymentState['depositState'] = !settled
    ? 'pending'
    : status === 'Overdue fee'
      ? 'captured'
      : finished
        ? 'released'
        : 'held'

  return {
    total,
    captured,
    refunded,
    balance: total - captured,
    depositHold: deposit,
    depositState,
    method: captured > 0 ? card : undefined,
    capturedAt: captured > 0 ? capturedAt : undefined,
    settled,
  }
}

/**
 * Identity is taken at booking and the background check runs before the branch will confirm;
 * insurance is only chased in the run-up to handover.
 */
function buildChecks(status: string, stageIndex: number): BookingCheckStep[] {
  return [
    { key: 'background', done: stageIndex >= 2 },
    { key: 'identity', done: status !== 'Awaiting ID' && stageIndex >= 1 },
    { key: 'insurance', done: stageIndex >= 3 },
  ]
}

/** The contract goes out for signature when the booking is confirmed. */
function buildAgreement(stageIndex: number, confirmedAt: string | undefined): BookingAgreement {
  const signed = stageIndex >= 2

  return {
    signed,
    signedAt: signed ? confirmedAt : undefined,
    method: signed ? 'eSignature' : undefined,
    version: AGREEMENT_VERSION,
  }
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
function exactCharges(booking: Booking): BookingChargeLine[] {
  const { pricing, rate, additionalDrivers, fees } = booking
  return [
    { key: 'baseRate', meta: { rate: rate.rate, days: rate.units }, amount: pricing.rentalSubtotal },
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
 * Mock scaffolding either way: the timeline, payment state, agreement and audit trail have no
 * endpoints yet, so they're derived from the status and the rental window.
 */
export function buildBookingDetails(tuple: BookingTuple, booking?: Booking): BookingDetails {
  const [customerName, reference, vehicleName, plate, window, , location, status, totalText] = tuple

  const dates = booking
    ? { from: new Date(booking.pickupAt), to: new Date(booking.returnAt) }
    : rentalWindowDates(window)
  const pickup = dates ? dates.from : new Date()
  const dropoff = dates ? dates.to : addDays(pickup, 1)
  const days = Math.max(1, Math.round((dropoff.getTime() - pickup.getTime()) / 86_400_000))

  const vehicle = findVehicle(plate)
  const branch = MOCK_BRANCHES.find((b) => b.name === location)
  const total = booking ? booking.pricing.total : Math.abs(parseBookingTotal(totalText))
  const taxRatePct = booking?.pricing.taxRatePct ?? vehicle?.fees.taxRatePct ?? DEFAULT_TAX_PCT

  const stages = buildStages(status, pickup, dropoff)
  const stageIndex = STAGE_INDEX[status] ?? 1
  const renter = buildRenter(customerName, total, booking)
  const agent = branch?.manager ?? ''
  const deposit = booking?.pricing.deposit ?? vehicle?.fees.deposit ?? 350
  const rateOption = vehicle?.rateOptions.find((o) => o.basis === 'day')
  const listDailyRate =
    booking && booking.rate.basis === 'day' ? booking.rate.rate : (rateOption?.rate ?? Math.round(total / days))
  const card = `Visa · ${4000 + (sequence(reference) % 1000)}`
  const payment = buildPayment(status, total, deposit, card, stages[1].at ?? pickup.toISOString(), stages[4].state === 'done')

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
    // Varied per booking so the page doesn't read as a template; there are no real desks to model.
    counter: `${(sequence(reference) % 3) + 1}`,
    agent,
    days,
    includedMiles,

    vehicleId: booking?.vehicleId ?? vehicle?.id,
    vehicleName,
    vehiclePlate: plate,
    vehicleImage: vehicle?.photos[0]?.url,
    vehicleSubtitle: vehicle
      ? `${vehicle.vehicleType} · ${vehicle.year} · ${vehicle.location}`
      : location,
    listDailyRate,

    charges: booking ? exactCharges(booking) : buildCharges(total, days, listDailyRate, taxRatePct, []),
    total,
    payment,
    agreement: buildAgreement(stageIndex, stages[1].at),
    checks: buildChecks(status, stageIndex),
    events: buildEvents(reference, stages, renter, plate, agent, deposit, payment.depositState !== 'pending'),
    renter,
  }
}
