import { toCustomer, toCustomerPayload, type CustomerWire } from '@/modules/customers/api/customer.mapper'
import type { BillingBasis } from '@/modules/vehicles/types/vehicle.types'
import {
  BOOKING_OVERDUE_STATUSES,
  type AdditionalDriver,
  type BookedInterval,
  type Booking,
  type BookingFee,
  type BookingInput,
  type BookingLists,
  type BookingStatus,
  type BookingVerification,
} from '../types/booking.types'
import { bookingToTuple } from '../utils/booking.utils'

/**
 * Translation layer between the portal's booking types and the FastAPI wire format, in the
 * same spirit as vehicle.mapper.ts: status slugs ↔ the canonical English labels the i18n keys
 * are built on, integer cents ↔ dollars, and null ↔ undefined for optional fields.
 */

// --- Wire types (mirror of the API's BookingRead) ------------------------------------------

export interface AdditionalDriverWire {
  id: string
  name: string
  licenceNumber: string
  pricePerDayCents: number
}

export interface BookingFeeWire {
  id: string
  label: string
  amountCents: number
}

export interface BookingWire {
  id: string
  reference: string
  status: string
  customer: CustomerWire
  vehicleId: string | null
  vehicleName: string
  vehiclePlate: string
  rate: {
    optionId: string
    label: string
    basis: BillingBasis
    rateCents: number
    units: number
    includedMiles: number | null
  }
  pickupLocation: string
  returnLocation: string
  pickupAt: string
  returnAt: string
  additionalDrivers: AdditionalDriverWire[]
  fees: BookingFeeWire[]
  verifications: BookingVerification[]
  pricing: {
    rentalSubtotalCents: number
    driversCents: number
    feesCents: number
    subtotalCents: number
    /** Serialized decimal, e.g. "7.00". */
    taxRatePct: string
    taxCents: number
    totalCents: number
    depositCents: number
  }
  createdAt: string
  updatedAt: string
}

export interface BookedIntervalWire {
  reference: string
  vehicleId: string
  vehiclePlate: string
  pickupAt: string
  returnAt: string
}

// --- Enum translation ----------------------------------------------------------------------

const STATUS_TO_API = {
  Confirmed: 'confirmed',
  'Awaiting ID': 'awaiting_id',
  'Deposit due': 'deposit_due',
  Completed: 'completed',
  'Overdue fee': 'overdue_fee',
  Refunded: 'refunded',
  'Payment failed': 'payment_failed',
} as const satisfies Record<BookingStatus, string>

const STATUS_FROM_API = Object.fromEntries(
  Object.entries(STATUS_TO_API).map(([portal, slug]) => [slug, portal]),
) as Record<string, BookingStatus>

// --- Money ---------------------------------------------------------------------------------

function toCents(dollars: number): number {
  return Math.round(dollars * 100)
}

function fromCents(cents: number): number {
  return cents / 100
}

// --- Reads ---------------------------------------------------------------------------------

function toDriver(wire: AdditionalDriverWire): AdditionalDriver {
  return { id: wire.id, name: wire.name, licenceNumber: wire.licenceNumber, pricePerDay: fromCents(wire.pricePerDayCents) }
}

function toFee(wire: BookingFeeWire): BookingFee {
  return { id: wire.id, label: wire.label, amount: fromCents(wire.amountCents) }
}

export function toBooking(wire: BookingWire): Booking {
  return {
    id: wire.id,
    reference: wire.reference,
    // An unknown slug renders as unconfirmed rather than blanking the row.
    status: STATUS_FROM_API[wire.status] ?? 'Deposit due',
    customer: toCustomer(wire.customer),
    vehicleId: wire.vehicleId ?? undefined,
    vehicleName: wire.vehicleName,
    vehiclePlate: wire.vehiclePlate,
    rate: {
      optionId: wire.rate.optionId,
      label: wire.rate.label,
      basis: wire.rate.basis,
      rate: fromCents(wire.rate.rateCents),
      units: wire.rate.units,
      includedMiles: wire.rate.includedMiles,
    },
    rateOptionId: wire.rate.optionId,
    pickupLocation: wire.pickupLocation,
    returnLocation: wire.returnLocation,
    pickupAt: wire.pickupAt,
    returnAt: wire.returnAt,
    additionalDrivers: wire.additionalDrivers.map(toDriver),
    fees: wire.fees.map(toFee),
    verifications: wire.verifications,
    pricing: {
      rentalSubtotal: fromCents(wire.pricing.rentalSubtotalCents),
      drivers: fromCents(wire.pricing.driversCents),
      fees: fromCents(wire.pricing.feesCents),
      subtotal: fromCents(wire.pricing.subtotalCents),
      taxRatePct: Number(wire.pricing.taxRatePct),
      tax: fromCents(wire.pricing.taxCents),
      total: fromCents(wire.pricing.totalCents),
      deposit: fromCents(wire.pricing.depositCents),
    },
    createdAt: wire.createdAt,
  }
}

export function toInterval(wire: BookedIntervalWire): BookedInterval {
  return {
    reference: wire.reference,
    vehicleId: wire.vehicleId,
    plate: wire.vehiclePlate,
    from: wire.pickupAt,
    to: wire.returnAt,
  }
}

/** Statuses after which the rental is over, one way or the other. */
const FINISHED_STATUSES: readonly BookingStatus[] = ['Completed', 'Refunded']

/**
 * Splits the API's flat list into what the table renders. "Upcoming" is anything still open —
 * not yet returned and not finished; everything else is recent activity. Overdue statuses stay
 * on the upcoming side too: the car is still out. The schedule only carries live rentals, so a
 * refunded booking never blocks a vehicle.
 */
export function toBookingLists(bookings: Booking[], now = new Date()): BookingLists {
  const cutoff = now.getTime()
  const open = (b: Booking) =>
    !FINISHED_STATUSES.includes(b.status) && (Date.parse(b.returnAt) >= cutoff || BOOKING_OVERDUE_STATUSES.includes(b.status))

  return {
    upcoming: bookings.filter(open).map(bookingToTuple),
    recent: bookings.filter((b) => !open(b)).map(bookingToTuple),
    schedule: bookings
      .filter((b) => b.vehicleId && !FINISHED_STATUSES.includes(b.status))
      .map((b) => ({ reference: b.reference, vehicleId: b.vehicleId as string, plate: b.vehiclePlate, from: b.pickupAt, to: b.returnAt })),
  }
}

// --- Writes --------------------------------------------------------------------------------

export function toBookingPayload(input: BookingInput) {
  return {
    ...(input.customerId && { customerId: input.customerId }),
    customer: toCustomerPayload(input.customer),
    vehicleId: input.vehicleId,
    rateOptionId: input.rateOptionId,
    pickupLocation: input.pickupLocation,
    returnLocation: input.returnLocation,
    pickupAt: input.pickupAt,
    returnAt: input.returnAt,
    additionalDrivers: input.additionalDrivers.map((d) => ({
      id: d.id,
      name: d.name.trim(),
      licenceNumber: d.licenceNumber.trim(),
      pricePerDayCents: toCents(d.pricePerDay),
    })),
    fees: input.fees.map((f) => ({ id: f.id, label: f.label.trim(), amountCents: toCents(f.amount) })),
    verifications: input.verifications,
  }
}
