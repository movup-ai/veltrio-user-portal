import type { DateRange } from '@/components/ui/date-range-picker'
import type { Customer, CustomerInput } from '@/modules/customers/types/customer.types'
import type { BillingBasis } from '@/modules/vehicles/types/vehicle.types'

/** [customer, reference, vehicle, plate, rentalWindow, note, location, status, total] */
export type BookingTuple = [
  customer: string,
  reference: string,
  vehicle: string,
  plate: string,
  rentalWindow: string,
  note: string,
  location: string,
  status: string,
  total: string,
]

/** Canonical booking statuses — display labels live in `domain:status.<value>`. */
export const BOOKING_STATUSES = [
  'Confirmed',
  'Awaiting ID',
  'Deposit due',
  'Completed',
  'Overdue fee',
  'Refunded',
  'Payment failed',
] as const
export type BookingStatus = (typeof BOOKING_STATUSES)[number]

/**
 * Statuses feeding the "Needs attention" stat and the Overdue tab. Typed as `readonly string[]`
 * so they can be tested against the plain strings a BookingTuple carries.
 */
export const BOOKING_ATTENTION_STATUSES: readonly string[] = [
  'Awaiting ID',
  'Deposit due',
  'Overdue fee',
  'Payment failed',
] satisfies BookingStatus[]

export const BOOKING_OVERDUE_STATUSES: readonly string[] = ['Overdue fee', 'Payment failed'] satisfies BookingStatus[]

export const BOOKING_TABS = ['Upcoming', 'Today', 'Recent activity', 'Overdue'] as const
export type BookingTab = (typeof BOOKING_TABS)[number]

/** Rental length in days — bounds only; the label lives in `bookings:filters.durationBand.<value>`. */
export const BOOKING_DURATION_BANDS = [
  { value: '1-2', min: 1, max: 2 },
  { value: '3-6', min: 3, max: 6 },
  { value: '7+', min: 7, max: Infinity },
] as const
export type BookingDurationBand = (typeof BOOKING_DURATION_BANDS)[number]['value']

/** Booking total in USD — bounds only; the label lives in `bookings:filters.valueBand.<value>`. */
export const BOOKING_VALUE_BANDS = [
  { value: '0-250', min: 0, max: 250 },
  { value: '250-500', min: 250, max: 500 },
  { value: '500-1000', min: 500, max: 1000 },
  { value: '1000+', min: 1000, max: Infinity },
] as const
export type BookingValueBand = (typeof BOOKING_VALUE_BANDS)[number]['value']

/** Orders the list can be read in. `newest` is the default — the most recently booked first. */
export const BOOKING_SORTS = ['newest', 'oldest', 'pickupDesc', 'pickupAsc', 'totalDesc', 'totalAsc'] as const
export type BookingSort = (typeof BOOKING_SORTS)[number]

/** Everything the list filters on. `Any`/`All`/an empty range are the "no constraint" values. */
export interface BookingFilters {
  search: string
  status: BookingStatus | 'Any'
  location: string | 'All'
  /** Pickup day must fall inside this span. Either end may be blank, meaning "open on that side". */
  pickup: DateRange
  make: string | 'All'
  durationBand: BookingDurationBand | 'Any'
  valueBands: BookingValueBand[]
}

/**
 * A window during which a vehicle is spoken for. Carries the plate as well as the id because
 * the availability strip on the vehicle page matches on plate. `from`/`to` are ISO timestamps.
 */
export interface BookedInterval {
  reference: string
  vehicleId: string
  plate: string
  from: string
  to: string
}

/**
 * The bookings list as the table renders it: the two display lists, plus the machine-readable
 * schedule that availability checks run against. Derived from the API's bookings in the mapper.
 */
export interface BookingLists {
  upcoming: BookingTuple[]
  recent: BookingTuple[]
  schedule: BookedInterval[]
}

/** Renter on the booking, as typed into the form. */
export type BookingCustomer = CustomerInput

/**
 * Named on the rental agreement alongside the main renter. The rate is per driver rather than
 * a single org-wide figure, so the counter can waive or discount one without touching the rest.
 */
export interface AdditionalDriver {
  id: string
  name: string
  licenceNumber: string
  /** Charged for every rental day. */
  pricePerDay: number
}

/**
 * A one-off charge added to this booking — cleaning, young-driver surcharge, a negotiated
 * add-on. Free-form because there is no ancillary catalog yet; a flat amount, not per-day.
 */
export interface BookingFee {
  id: string
  label: string
  amount: number
}

/** Pre-handover checks the branch can require. Labels live in `bookings:verification.<key>`. */
export const BOOKING_VERIFICATIONS = ['identity', 'background', 'insurance'] as const
export type BookingVerification = (typeof BOOKING_VERIFICATIONS)[number]

/**
 * Payload for creating a booking. The server assigns the reference and status, prices the
 * rental from the vehicle's current rate card, and snapshots the vehicle's name and plate.
 */
export interface BookingInput {
  /**
   * Set when the renter was picked from the customer book: the booking links to that customer
   * and refreshes their details from `customer`. Absent, the email decides — a known email
   * links to its customer, a new one creates them.
   */
  customerId?: string
  customer: BookingCustomer
  vehicleId: string
  rateOptionId: string
  pickupLocation: string
  returnLocation: string
  /** ISO timestamps. */
  pickupAt: string
  returnAt: string
  additionalDrivers: AdditionalDriver[]
  fees: BookingFee[]
  verifications: BookingVerification[]
}

/** The rate option as it was when booked — vehicle rate cards change afterwards. */
export interface BookingRate {
  optionId: string
  label: string
  basis: BillingBasis
  rate: number
  /** Billable units of the rate (3 days, 2 weeks, 1 fixed block). */
  units: number
  /** Across the whole rental; `null` means unlimited. */
  includedMiles: number | null
}

/** The quote as stored with the booking. The lines sum to `total`; the deposit is held, not charged. */
export interface BookingQuote {
  rentalSubtotal: number
  drivers: number
  fees: number
  subtotal: number
  taxRatePct: number
  tax: number
  total: number
  deposit: number
}

export interface Booking extends Omit<BookingInput, 'customerId' | 'customer' | 'vehicleId'> {
  id: string
  reference: string
  status: BookingStatus
  customer: Customer
  /**
   * The vehicle's name and plate are copied onto the booking so the row still reads correctly
   * after the vehicle is renamed or archived. `vehicleId` is absent once the vehicle is deleted.
   */
  vehicleId?: string
  vehicleName: string
  vehiclePlate: string
  rate: BookingRate
  pricing: BookingQuote
  createdAt: string
}

/** The five stages a rental moves through, in order. Labels live in `bookings:details.stages.<key>`. */
export const BOOKING_STAGES = ['reserved', 'confirmed', 'pickedUp', 'returned', 'closed'] as const
export type BookingStage = (typeof BOOKING_STAGES)[number]

export interface BookingStageStep {
  key: BookingStage
  /** `done` is behind us, `current` is where the rental sits now, `pending` is still ahead. */
  state: 'done' | 'current' | 'pending'
  /** ISO — when it happened, or when it falls due. Absent when there is nothing to date yet. */
  at?: string
  /** How it was done. Only meaningful once the stage is behind us. */
  channel?: 'web' | 'auto' | 'counter'
}

/**
 * Pre-handover checks shown on the details page — the same three the booking form asks for
 * (see BOOKING_VERIFICATIONS). Labels live in `bookings:details.checks.<key>`.
 */
export const BOOKING_CHECKS = ['background', 'identity', 'insurance'] as const
export type BookingCheck = (typeof BOOKING_CHECKS)[number]

export interface BookingCheckStep {
  key: BookingCheck
  done: boolean
}

/** The contract itself, which is a document to chase rather than a check to tick. */
export interface BookingAgreement {
  signed: boolean
  signedAt?: string
  /** How it was signed — only set once it has been. */
  method?: 'eSignature' | 'counter'
  /** Terms revision the renter agreed to, so an old booking can be read against its own terms. */
  version: string
}

/**
 * One line of the charges breakdown. `extraFee` carries the label the counter typed; every other
 * kind is named by `bookings:details.charges.<key>`. The lines always sum to the booking total.
 */
export interface BookingChargeLine {
  key: 'baseRate' | 'additionalDriver' | 'extraFee' | 'taxes'
  label?: string
  /** Interpolation values for the line's sub-caption. */
  meta?: { rate?: number; days?: number; count?: number; pct?: number }
  amount: number
}

/** Events on the booking's audit trail. Labels live in `bookings:details.events.<key>`. */
export const BOOKING_EVENTS = ['created', 'depositHold', 'licenceUploaded', 'confirmationSent', 'vehicleAssigned'] as const
export type BookingEvent = (typeof BOOKING_EVENTS)[number]

export interface BookingEventEntry {
  key: BookingEvent
  at: string
  /** Interpolation values for the event's detail line — channel, amount, plate, and so on. */
  meta?: Record<string, string | number>
}

/**
 * Where the deposit stands. `pending` means no hold has been placed yet; `held` is authorized
 * and reversible; `released` and `captured` are both terminal, one in the renter's favour.
 */
export type BookingDepositState = 'pending' | 'held' | 'released' | 'captured'

export interface BookingPaymentState {
  /** The booking total. The itemization behind it belongs to the charges card, not here. */
  total: number
  captured: number
  refunded: number
  balance: number
  depositHold: number
  depositState: BookingDepositState
  /** "Visa · 4223" — how the money was taken. Absent until something is captured. */
  method?: string
  capturedAt?: string
  /** Nothing left to collect. Drives the badge and which actions are offered. */
  settled: boolean
}

export interface BookingRenter {
  id?: string
  name: string
  email: string
  phone: string
  licenceNumber: string
  rentals: number
  lifetimeValue: number
  /** Year they first rented — the "customer since" line. */
  since: number
}

/** Everything the booking details page renders. Assembled by `booking.details.ts`. */
export interface BookingDetails {
  reference: string
  status: string
  stages: BookingStageStep[]

  pickupAt: string
  returnAt: string
  pickupLocation: string
  pickupAddress: string
  returnLocation: string
  /** True when the car comes back to the branch it left from — by far the common case. */
  returnSameBranch: boolean
  counter: string
  agent: string
  days: number
  /** Across the whole rental; `null` means unlimited. */
  includedMiles: number | null

  vehicleId?: string
  vehicleName: string
  vehiclePlate: string
  /** Cover shot from the vehicle's gallery. Absent when the car has no photos on file. */
  vehicleImage?: string
  /** "Full-size SUV · 2024 · Miami Beach". */
  vehicleSubtitle: string
  /** What the vehicle lists for today — not necessarily what this booking was charged. */
  listDailyRate: number

  charges: BookingChargeLine[]
  total: number
  payment: BookingPaymentState
  agreement: BookingAgreement
  checks: BookingCheckStep[]
  events: BookingEventEntry[]
  renter: BookingRenter
}
