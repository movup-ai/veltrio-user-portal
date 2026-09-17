import type { BillingBasis, RateOption, Vehicle } from '@/modules/vehicles/types/vehicle.types'
import { bookingExtra, type BookingExtraKey } from '../types/booking.types'

const MS_PER_HOUR = 1000 * 60 * 60

/** Hours in one billable unit. `fixed` is excluded — its block length is per rate option. */
const HOURS_PER_UNIT: Record<Exclude<BillingBasis, 'fixed'>, number> = {
  hour: 1,
  day: 24,
  week: 24 * 7,
  month: 24 * 30,
}

const HOURS_PER_DURATION_UNIT = { hours: 1, days: 24, weeks: 24 * 7, months: 24 * 30 } as const

export interface ExtraCharge {
  key: BookingExtraKey
  pricePerDay: number
  amount: number
}

export interface BookingPricing {
  hours: number
  /** Whole rental days, rounded up — what the per-day extras are billed on. */
  days: number
  /** Billable units of the chosen rate option (3 days, 2 weeks, 1 fixed block, …). */
  units: number
  rentalSubtotal: number
  extras: ExtraCharge[]
  extrasSubtotal: number
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
  extras: BookingExtraKey[]
}

export function priceBooking({ vehicle, option, pickupAt, returnAt, extras }: PriceBookingArgs): BookingPricing {
  const hours = durationHours(pickupAt, returnAt)
  const days = Math.max(1, Math.ceil(hours / 24))
  const units = billableUnits(option, hours)

  const rentalSubtotal = option.rate * units

  const extraCharges: ExtraCharge[] = extras
    .map((key) => bookingExtra(key))
    .filter((e) => e != null)
    .map((e) => ({ key: e.key, pricePerDay: e.pricePerDay, amount: e.pricePerDay * days }))
  const extrasSubtotal = extraCharges.reduce((sum, e) => sum + e.amount, 0)

  const subtotal = rentalSubtotal + extrasSubtotal
  const taxRatePct = vehicle.fees.taxRatePct ?? 0
  const tax = Math.round(subtotal * taxRatePct) / 100

  return {
    hours,
    days,
    units,
    rentalSubtotal,
    extras: extraCharges,
    extrasSubtotal,
    subtotal,
    taxRatePct,
    tax,
    total: subtotal + tax,
    deposit: vehicle.fees.deposit ?? 0,
    includedMiles: option.unlimitedMileage ? null : (option.includedMiles ?? 0) * units,
  }
}
