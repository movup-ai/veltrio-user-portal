import { fromCents, percentOfCents, toCents } from '@/lib/money'
import type { Vehicle } from '@/modules/vehicles/types/vehicle.types'
import { planRental, planTotal, type RatePlan } from '@/modules/vehicles/utils/rate-plan'

const MS_PER_HOUR = 1000 * 60 * 60

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
  /** The rates the cost engine chose, and any length-of-rental discount. */
  plan: RatePlan
  /** Before the discount. */
  rentalSubtotal: number
  discount: number
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
  /** Total miles included across the rental; `null` means unlimited. */
  includedMiles: number | null
}

/** Hours between two ISO timestamps. Returns 0 for a missing, unparseable or reversed range. */
export function durationHours(pickupAt: string, returnAt: string): number {
  const from = new Date(pickupAt).getTime()
  const to = new Date(returnAt).getTime()
  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) return 0
  return (to - from) / MS_PER_HOUR
}

interface PriceBookingArgs {
  vehicle: Vehicle
  pickupAt: string
  returnAt: string
  /** Drivers beyond the main renter, each with its own daily rate. */
  additionalDrivers?: { pricePerDay: number }[]
  /** Ad-hoc one-off charges. Blank labels are dropped so a half-typed row can't bill anyone. */
  fees?: { id: string; label: string; amount: number }[]
}

/**
 * The quote the form shows. The API's `pricing.py` re-prices the booking on create with the
 * same rules, so what the renter sees here is what they are charged. Null when the vehicle has
 * no rate options to bill at.
 */
export function priceBooking({
  vehicle,
  pickupAt,
  returnAt,
  additionalDrivers = [],
  fees = [],
}: PriceBookingArgs): BookingPricing | null {
  const hours = durationHours(pickupAt, returnAt)
  const plan = planRental(vehicle.rateOptions, vehicle.discountTiers, hours, vehicle.billableHoursPerDay)
  if (!plan) return null
  const days = rentalDays(hours)

  // Summed in whole cents, as the API does: float dollars drift a cent off what it charges.
  const driversPerDayCents = additionalDrivers.reduce(
    (sum, d) => sum + (Number.isFinite(d.pricePerDay) ? toCents(d.pricePerDay) : 0),
    0,
  )
  const driversCents = driversPerDayCents * days
  const drivers: DriverCharge | null =
    additionalDrivers.length > 0
      ? {
          count: additionalDrivers.length,
          perDay: fromCents(driversPerDayCents),
          amount: fromCents(driversCents),
        }
      : null

  const feeCharges: FeeCharge[] = fees
    .filter((f) => f.label.trim().length > 0)
    .map((f) => ({ id: f.id, label: f.label.trim(), amount: Number.isFinite(f.amount) ? f.amount : 0 }))
  const feesCents = feeCharges.reduce((sum, f) => sum + toCents(f.amount), 0)

  const subtotalCents = toCents(planTotal(plan)) + driversCents + feesCents
  const taxRatePct = vehicle.fees.taxRatePct ?? 0
  const taxCents = percentOfCents(subtotalCents, taxRatePct)

  return {
    hours,
    days,
    plan,
    rentalSubtotal: plan.subtotal,
    discount: plan.discount?.amount ?? 0,
    drivers,
    fees: feeCharges,
    feesTotal: fromCents(feesCents),
    subtotal: fromCents(subtotalCents),
    taxRatePct,
    tax: fromCents(taxCents),
    total: fromCents(subtotalCents + taxCents),
    deposit: vehicle.fees.deposit ?? 0,
    includedMiles: plan.includedMiles,
  }
}
