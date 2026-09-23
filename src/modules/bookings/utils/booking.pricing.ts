import type { BillingBasis, RateOption, Vehicle } from '@/modules/vehicles/types/vehicle.types'

const MS_PER_HOUR = 1000 * 60 * 60

/** Hours in one billable unit. `fixed` is excluded — its block length is per rate option. */
const HOURS_PER_UNIT: Record<Exclude<BillingBasis, 'fixed'>, number> = {
  hour: 1,
  day: 24,
  week: 24 * 7,
  month: 24 * 30,
}

const HOURS_PER_DURATION_UNIT = { hours: 1, days: 24, weeks: 24 * 7, months: 24 * 30 } as const

/** Billable days for the trip — what the per-day driver charge is billed on. Always at least one. */
export function rentalDays(hours: number): number {
  return Math.max(1, Math.ceil(hours / 24))
}

/**
 * Rate a newly added driver starts on. Only a starting point — each driver carries its own
 * rate, so the counter can waive or discount one without affecting the others.
 */
export const ADDITIONAL_DRIVER_PER_DAY = 12

export interface DriverCharge {
  count: number
  /** Sum of every driver's daily rate — drivers can be priced differently. */
  perDay: number
  amount: number
}

export interface FeeCharge {
  id: string
  label: string
  amount: number
}

export interface BookingPricing {
  hours: number
  /** Whole rental days, rounded up — what the per-day driver charge is billed on. */
  days: number
  /** Billable units of the chosen rate option (3 days, 2 weeks, 1 fixed block, …). */
  units: number
  rentalSubtotal: number
  /** Null when the renter is driving alone. */
  drivers: DriverCharge | null
  /** Ad-hoc charges added to this booking, each a flat amount. */
  fees: FeeCharge[]
  feesTotal: number
  subtotal: number
  taxRatePct: number
  tax: number
  total: number
  /** Held, not charged — reported alongside the total rather than inside it. */
  deposit: number
  /** Total miles included across all units; `null` means unlimited. */
  includedMiles: number | null
}

/** Hours between two ISO timestamps. Returns 0 for a missing, unparseable or reversed range. */
export function durationHours(pickupAt: string, returnAt: string): number {
  const from = new Date(pickupAt).getTime()
  const to = new Date(returnAt).getTime()
  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) return 0
  return (to - from) / MS_PER_HOUR
}

/** Length of one `fixed` block in hours — defaults to a single day when the option is incomplete. */
function fixedBlockHours(option: RateOption): number {
  const unit = option.blockDurationUnit ?? 'days'
  const count = option.blockDuration ?? 1
  return Math.max(1, count) * HOURS_PER_DURATION_UNIT[unit]
}

/**
 * Billable units for a rental of `hours`, always rounded up and never below 1 — a 26-hour
 * rental on a daily rate is 2 days, and any non-zero rental is charged at least one unit.
 */
export function billableUnits(option: RateOption, hours: number): number {
  const perUnit = option.basis === 'fixed' ? fixedBlockHours(option) : HOURS_PER_UNIT[option.basis]
  return Math.max(1, Math.ceil(hours / perUnit))
}

interface PriceBookingArgs {
  vehicle: Vehicle
  option: RateOption
  pickupAt: string
  returnAt: string
  /** Drivers beyond the main renter, each with its own daily rate. */
  additionalDrivers?: { pricePerDay: number }[]
  /** Ad-hoc one-off charges. Blank labels are dropped so a half-typed row can't bill anyone. */
  fees?: { id: string; label: string; amount: number }[]
}

export function priceBooking({
  vehicle,
  option,
  pickupAt,
  returnAt,
  additionalDrivers = [],
  fees = [],
}: PriceBookingArgs): BookingPricing {
  const hours = durationHours(pickupAt, returnAt)
  const days = rentalDays(hours)
  const units = billableUnits(option, hours)

  const rentalSubtotal = option.rate * units

  const driversPerDay = additionalDrivers.reduce(
    (sum, d) => sum + (Number.isFinite(d.pricePerDay) ? d.pricePerDay : 0),
    0,
  )
  const drivers: DriverCharge | null =
    additionalDrivers.length > 0
      ? { count: additionalDrivers.length, perDay: driversPerDay, amount: driversPerDay * days }
      : null

  const feeCharges: FeeCharge[] = fees
    .filter((f) => f.label.trim().length > 0)
    .map((f) => ({ id: f.id, label: f.label.trim(), amount: Number.isFinite(f.amount) ? f.amount : 0 }))
  const feesTotal = feeCharges.reduce((sum, f) => sum + f.amount, 0)

  const subtotal = rentalSubtotal + (drivers?.amount ?? 0) + feesTotal
  const taxRatePct = vehicle.fees.taxRatePct ?? 0
  const tax = Math.round(subtotal * taxRatePct) / 100

  return {
    hours,
    days,
    units,
    rentalSubtotal,
    drivers,
    fees: feeCharges,
    feesTotal,
    subtotal,
    taxRatePct,
    tax,
    total: subtotal + tax,
    deposit: vehicle.fees.deposit ?? 0,
    includedMiles: option.unlimitedMileage ? null : (option.includedMiles ?? 0) * units,
  }
}
