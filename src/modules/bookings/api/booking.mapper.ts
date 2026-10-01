import { toCustomer, toCustomerPayload, type CustomerWire } from '@/modules/customers/api/customer.mapper'
import type { BillingBasis } from '@/modules/vehicles/types/vehicle.types'
import { fromCents, toCents } from '@/lib/money'
import { toLimitOffset } from '@/lib/pagination'
import type { PaginationParams } from '@/types/common'
import {
  BOOKING_OVERDUE_STATUSES,
  type AdditionalDriver,
  type BookedInterval,
  type Booking,
  type BookingDraft,
  type BookingFee,
  type BookingInput,
  type BookingLists,
  type BookingFilters,
  type BookingSort,
  type BookingStats,
  type BookingStatus,
  type PaymentState,
  type BookingTab,
  type VerificationKind,
  type BookingVerification,
  type VerificationRecord,
  type VerificationStatus,
} from '../types/booking.types'
import { bookingToTuple } from '../utils/booking.utils'

/**
 * Translation layer between the portal's booking types and the FastAPI wire format, in the
 * same spirit as vehicle.mapper.ts: status slugs ↔ the canonical English labels the i18n keys
 * are built on, integer cents ↔ dollars, and null ↔ undefined for optional fields.
 */

// --- Wire types (mirror of the API's BookingRead) ------------------------------------------

interface AdditionalDriverWire {
  id: string
  name: string
  licenceNumber: string
  pricePerDayCents: number
}

interface BookingFeeWire {
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
    lines: {
      optionId: string
      label: string
      basis: BillingBasis
      rateCents: number
      count: number
      cappedHours: number | null
    }[]
  }
  pickupLocation: string
  returnLocation: string
  pickupAt: string
  returnAt: string
  additionalDrivers: AdditionalDriverWire[]
  fees: BookingFeeWire[]
  verifications: VerificationKind[]
  pricing: {
    rentalSubtotalCents: number
    discount: { minDays: number; percentOff: number; amountCents: number } | null
    driversCents: number
    feesCents: number
    subtotalCents: number
    /** Serialized decimal, e.g. "7.00". */
    taxRatePct: string
    taxCents: number
    totalCents: number
    depositCents: number
  }
  payment: {
    state: PaymentState
    paidCents: number
    refundedCents: number
    method: string | null
    paidAt: string | null
  }
  contract: { signedAt: string | null; version: string | null }
  verification: VerificationWire | null
  pickedUpAt: string | null
  returnedAt: string | null
  createdAt: string
  updatedAt: string
}

/** A US postal address. All four parts or none: Checkr rejects a partial one. */
interface VerificationAddressWire {
  street: string
  city: string
  state: string
  zipCode: string
}

/** Verification someone who is not a renter: no email, no booking, no customer. */
export interface StandaloneOrderWire {
  name: string
  dateOfBirth: string
  address?: VerificationAddressWire
}

/** Who to verify insurance for, and where Axle returns them afterwards. */
export interface InsuranceOrderWire {
  name: string
  dateOfBirth: string
  email?: string
  reference?: string
  /** The rental window, from the booking form; the API reads it off the booking otherwise. */
  coversFrom?: string
  coversThrough?: string
  redirectUri: string
}

/** The session to send the renter to, and the row waiting on them. */
export interface InsuranceSessionWire {
  verification: VerificationWire
  ignitionUri: string
}

/** What the redirect came back with. Posted without a login: the renter may be on their phone. */
export interface InsuranceCallbackWire {
  tenantId: string
  verificationId: string
  authCode: string
}

/** All the public completion returns. No verdict: anyone holding the return link could read it. */
export interface InsuranceOutcomeWire {
  verificationId: string
}

/** Sends the renter their session link. The API side of this is not built yet. */
export interface InsuranceLinkWire {
  channel: 'email' | 'sms'
  to: string
}

/** One row of the verification log. */
export interface VerificationListWire {
  id: string
  kind: VerificationKind
  name: string
  dateOfBirth: string | null
  email: string | null
  customerId: string | null
  bookingReference?: string | null
  coversFrom?: string | null
  coversThrough?: string | null
  status: VerificationStatus
  recordsFound: boolean
  hasReport: boolean
  completedAt: string | null
  createdAt: string
}

/** What ordering a check sends: the fields Checkr matches on, plus who the renter is. */
export interface VerificationOrder {
  name: string
  email: string
  dateOfBirth: string
}

export interface VerificationWire {
  id: string
  customerId: string
  status: VerificationStatus
  failureReason: string | null
  recordsFound: boolean
  hasReport: boolean
  canReorder: boolean
  reused: boolean
  policy?: InsurancePolicyWire | null
  coversFrom?: string | null
  coversThrough?: string | null
  forOtherDates?: boolean
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

/** The policy behind an insurance verdict. `carrier` is Axle's slug, such as `state-farm`. */
interface InsurancePolicyWire {
  carrier: string | null
  policyNumber: string | null
  expiresOn: string | null
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
  Pending: 'pending',
  Confirmed: 'confirmed',
  'On rental': 'on_rental',
  Returned: 'returned',
  Completed: 'completed',
  Cancelled: 'cancelled',
  Overdue: 'overdue',
} as const satisfies Record<BookingStatus, string>

const STATUS_FROM_API = Object.fromEntries(
  Object.entries(STATUS_TO_API).map(([portal, slug]) => [slug, portal]),
) as Record<string, BookingStatus>

// --- Reads ---------------------------------------------------------------------------------

function toDriver(wire: AdditionalDriverWire): AdditionalDriver {
  return {
    id: wire.id,
    name: wire.name,
    licenceNumber: wire.licenceNumber,
    pricePerDay: fromCents(wire.pricePerDayCents),
  }
}

function toFee(wire: BookingFeeWire): BookingFee {
  return { id: wire.id, label: wire.label, amount: fromCents(wire.amountCents) }
}

export function toBooking(wire: BookingWire): Booking {
  return {
    id: wire.id,
    reference: wire.reference,
    // An unknown status shows as itself rather than being folded into a known one, which
    // would state something about the rental the API never said. The badge falls back to
    // neutral colours.
    status: STATUS_FROM_API[wire.status] ?? (wire.status as BookingStatus),
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
      lines: wire.rate.lines.map((line) => ({
        optionId: line.optionId,
        label: line.label,
        basis: line.basis,
        rate: fromCents(line.rateCents),
        count: line.count,
        cappedHours: line.cappedHours ?? undefined,
      })),
    },
    pickupLocation: wire.pickupLocation,
    returnLocation: wire.returnLocation,
    pickupAt: wire.pickupAt,
    returnAt: wire.returnAt,
    additionalDrivers: wire.additionalDrivers.map(toDriver),
    fees: wire.fees.map(toFee),
    verifications: wire.verifications,
    pricing: {
      rentalSubtotal: fromCents(wire.pricing.rentalSubtotalCents),
      discount: wire.pricing.discount && {
        minDays: wire.pricing.discount.minDays,
        percentOff: wire.pricing.discount.percentOff,
        amount: fromCents(wire.pricing.discount.amountCents),
      },
      drivers: fromCents(wire.pricing.driversCents),
      fees: fromCents(wire.pricing.feesCents),
      subtotal: fromCents(wire.pricing.subtotalCents),
      taxRatePct: Number(wire.pricing.taxRatePct),
      tax: fromCents(wire.pricing.taxCents),
      total: fromCents(wire.pricing.totalCents),
      deposit: fromCents(wire.pricing.depositCents),
    },
    payment: {
      state: wire.payment.state,
      paid: fromCents(wire.payment.paidCents),
      refunded: fromCents(wire.payment.refundedCents),
      method: wire.payment.method ?? undefined,
      paidAt: wire.payment.paidAt ?? undefined,
    },
    contract: {
      signedAt: wire.contract.signedAt ?? undefined,
      version: wire.contract.version ?? undefined,
    },
    verification: wire.verification ? toVerification(wire.verification) : undefined,
    pickedUpAt: wire.pickedUpAt ?? undefined,
    returnedAt: wire.returnedAt ?? undefined,
    createdAt: wire.createdAt,
  }
}

export function toVerification(wire: VerificationWire): BookingVerification {
  return {
    id: wire.id,
    customerId: wire.customerId,
    status: wire.status,
    failureReason: wire.failureReason ?? undefined,
    recordsFound: wire.recordsFound,
    hasReport: wire.hasReport,
    canReorder: wire.canReorder,
    reused: wire.reused,
    policy: wire.policy
      ? {
          carrier: wire.policy.carrier ? toCarrierName(wire.policy.carrier) : undefined,
          policyNumber: wire.policy.policyNumber ?? undefined,
          expiresOn: wire.policy.expiresOn ?? undefined,
        }
      : undefined,
    coversFrom: wire.coversFrom ?? undefined,
    coversThrough: wire.coversThrough ?? undefined,
    forOtherDates: wire.forOtherDates ?? false,
    completedAt: wire.completedAt ?? undefined,
    createdAt: wire.createdAt,
    updatedAt: wire.updatedAt,
  }
}

/** `state-farm` → `State Farm`: Axle names carriers by slug. */
function toCarrierName(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')
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

/** The rental is over and the car is free, one way or the other. */
const FINISHED_STATUSES: readonly BookingStatus[] = ['Returned', 'Completed', 'Cancelled']

export function toBookingLists(bookings: Booking[], now = new Date()): BookingLists {
  const cutoff = now.getTime()
  const open = (b: Booking) =>
    !FINISHED_STATUSES.includes(b.status) &&
    (Date.parse(b.returnAt) >= cutoff || BOOKING_OVERDUE_STATUSES.includes(b.status))

  return {
    upcoming: bookings.filter(open).map(bookingToTuple),
    recent: bookings.filter((b) => !open(b)).map(bookingToTuple),
    schedule: bookings
      .filter((b) => b.vehicleId && !FINISHED_STATUSES.includes(b.status))
      .map((b) => ({
        reference: b.reference,
        vehicleId: b.vehicleId as string,
        plate: b.vehiclePlate,
        from: b.pickupAt,
        to: b.returnAt,
      })),
  }
}

// --- Writes --------------------------------------------------------------------------------

export function toBookingPayload(input: BookingInput) {
  return {
    ...(input.customerId && { customerId: input.customerId }),
    customer: toCustomerPayload(input.customer),
    vehicleId: input.vehicleId,
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

// --- Drafts --------------------------------------------------------------------------------

export interface BookingDraftWire {
  id: string
  reference: string
  payload: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/** Nothing to translate — the payload is the portal's own shape, stored as-is. */
export function toBookingDraft(wire: BookingDraftWire): BookingDraft {
  return {
    id: wire.id,
    reference: wire.reference,
    payload: wire.payload,
    createdAt: wire.createdAt,
    updatedAt: wire.updatedAt,
  }
}

// --- List query ----------------------------------------------------------------------------

/** Tabs, as the API names them. The portal's own labels stay in BOOKING_TABS. */
const TAB_TO_API: Record<BookingTab, string | undefined> = {
  // The API has no "all" tab; leaving the param off is what returns the whole book.
  All: undefined,
  Upcoming: 'upcoming',
  Today: 'today',
  'Recent activity': 'recent',
  Overdue: 'overdue',
}

export interface BookingListParams extends PaginationParams {
  filters: BookingFilters
  tab: BookingTab
  sort: BookingSort
}

/**
 * Filters go to the API as query params. Every "no constraint" value — `Any`, `All`, an empty
 * range — is omitted rather than sent, so the server sees only what the counter actually chose.
 */
export function toBookingListQuery(params: BookingListParams): Record<string, unknown> {
  const { filters, tab, sort } = params
  const query: Record<string, unknown> = {
    ...toLimitOffset({ page: params.page, pageSize: params.pageSize }),
    sort,
  }
  const apiTab = TAB_TO_API[tab]
  if (apiTab) query.tab = apiTab

  const search = filters.search.trim()
  if (search) query.search = search
  if (filters.status !== 'Any') query.status = STATUS_TO_API[filters.status]
  if (filters.location !== 'All') query.location = filters.location
  if (filters.make !== 'All') query.make = filters.make
  if (filters.pickup.from) query.pickupFrom = filters.pickup.from
  if (filters.pickup.to) query.pickupTo = filters.pickup.to
  if (filters.durationBand !== 'Any') query.durationBand = filters.durationBand
  if (filters.valueBands.length > 0) query.valueBand = filters.valueBands

  return query
}

/** The same filters without paging, for the endpoints that only narrow. */
export function toBookingFilterQuery(filters: BookingFilters): Record<string, unknown> {
  const query = toBookingListQuery({ filters, tab: 'Upcoming', sort: 'newest', page: 1, pageSize: 1 })
  for (const key of ['limit', 'offset', 'tab', 'sort']) delete query[key]
  return query
}

// --- Stats ---------------------------------------------------------------------------------

export interface BookingTabCountsWire {
  upcoming: number
  today: number
  recent: number
  overdue: number
}

export interface BookingStatsWire {
  openBookings: number
  startingSoon: number
  expectedRevenueCents: number
  needsAttention: number
  unpaid: number
  unsigned: number
  ready: number
  tabCounts: BookingTabCountsWire
}

export function toTabCounts(wire: BookingTabCountsWire): Record<BookingTab, number> {
  return {
    // Upcoming is the API's open clause and recent its negation, over non-null columns, so
    // together they are every booking under the same filters.
    All: wire.upcoming + wire.recent,
    Upcoming: wire.upcoming,
    Today: wire.today,
    'Recent activity': wire.recent,
    Overdue: wire.overdue,
  }
}

export function toBookingStats(wire: BookingStatsWire): BookingStats {
  return {
    openBookings: wire.openBookings,
    startingSoon: wire.startingSoon,
    expectedRevenue: fromCents(wire.expectedRevenueCents),
    needsAttention: wire.needsAttention,
    unpaid: wire.unpaid,
    unsigned: wire.unsigned,
    ready: wire.ready,
    tabCounts: toTabCounts(wire.tabCounts),
  }
}

/** A verification-log row as the table renders it. */
export function toVerificationListRow(wire: VerificationListWire): VerificationRecord {
  return {
    id: wire.id,
    kind: wire.kind,
    name: wire.name,
    dateOfBirth: wire.dateOfBirth ?? undefined,
    email: wire.email ?? undefined,
    customerId: wire.customerId ?? undefined,
    bookingReference: wire.bookingReference ?? undefined,
    coversFrom: wire.coversFrom ?? undefined,
    coversThrough: wire.coversThrough ?? undefined,
    status: wire.status,
    recordsFound: wire.recordsFound,
    hasReport: wire.hasReport,
    completedAt: wire.completedAt ?? undefined,
    createdAt: wire.createdAt,
  }
}
