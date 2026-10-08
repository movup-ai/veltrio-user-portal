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
  pickupAt?: string,
  returnAt?: string,
  /** Cover thumbnail, resolved from the fleet. Absent for a car with no photos on file. */
  vehicleImage?: string,
  /** Identifies the car for that lookup. Absent once the vehicle is deleted. */
  vehicleId?: string,
  /** Paid and signed, so the keys can be handed over. Derived, never stored. */
  ready?: boolean,
  /** A renter's request the company turned down; `status` says only Cancelled. */
  declined?: boolean,
]

/**
 * Where the rental is, in lifecycle order — money and paperwork are `payment` and `contract`.
 * Display labels live in `domain:status.<value>`.
 */
export const BOOKING_STATUSES = [
  'Pending',
  'Confirmed',
  'On rental',
  'Returned',
  'Completed',
  'Cancelled',
  'Overdue',
] as const
export type BookingStatus = (typeof BOOKING_STATUSES)[number]

/**
 * What has actually been taken, as opposed to the quote in `pricing`. `paid` is fully paid,
 * the rental and the deposit held: pickup waits for it.
 */
export const PAYMENT_STATES = ['unpaid', 'deposit_held', 'rental_paid', 'paid', 'refunded'] as const
export type PaymentState = (typeof PAYMENT_STATES)[number]

/** How a renter booking for themselves asked to pay. A wish: nothing is charged because of it. */
export const PAYMENT_PREFERENCES = ['online_rental_and_deposit', 'online_rental_only', 'cash'] as const
export type PaymentPreference = (typeof PAYMENT_PREFERENCES)[number]

/** What a renter asked for with their own reservation. Absent on a booking taken at the counter. */
export interface BookingRequest {
  paymentPreference?: PaymentPreference
  notes?: string
}

/** Why a reservation was turned down. Labels live in `bookings:details.declined.reasons.<value>`. */
export const DECLINE_REASONS = [
  'dates_unavailable',
  'vehicle_unavailable',
  'renter_not_verified',
  'other',
] as const
export type DeclineReason = (typeof DECLINE_REASONS)[number]

/** What the decline dialog sends. The renter is emailed both. */
export interface DeclineInput {
  reason: DeclineReason
  message: string
}

/** A decline as the booking keeps it. Its presence is what tells declined from cancelled. */
export interface BookingDecline {
  reason: DeclineReason
  message?: string
  at: string
  /** The API's answer on whether it can still be undone: only until the pickup time asked for. */
  restorable: boolean
}

export interface BookingPayment {
  state: PaymentState
  paid: number
  refunded: number
  /** "Visa · 4223". Absent until something is taken. */
  method?: string
  paidAt?: string
}

/** Fuel on the gauge, in eighths of a tank: 0 is empty, 8 is full. */
export const FUEL_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const
export type FuelLevel = (typeof FUEL_LEVELS)[number]

/** Which end of the rental a reading or photo was taken at. */
export type ConditionStage = 'pickup' | 'return'

/** What was read off the car as it changed hands. */
export interface BookingCondition {
  /** Miles on the clock. */
  odometer: number
  fuelLevel: FuelLevel
  notes?: string
}

/** What the handover form sends. A return also says where the car goes next. */
export interface ConditionInput {
  odometer: number
  fuelLevel: FuelLevel
  notes: string
  sendToService?: boolean
  /** The photos this handover keeps, by id. The API discards any other left on the stage. */
  photoIds?: string[]
}

/** A photo of the car at one handover. `url` is the image itself and expires within the hour. */
export interface ConditionPhoto {
  id: string
  stage: ConditionStage
  name: string
  url: string
}

/** A photo picked on a handover form and not sent yet. `url` is a preview of the file itself. */
export interface ConditionPhotoDraft {
  id: string
  name: string
  url: string
  file: File
}

/** A whole handover form: the readings, and the photos to store with them. */
export interface HandoverInput extends ConditionInput {
  photos: File[]
}

export interface BookingContract {
  /** Null means unsigned — the timestamp is the flag. */
  signedAt?: string
  version?: string
}

/**
 * Statuses feeding the "Needs attention" stat and the Overdue tab. Typed as `readonly string[]`
 * so they can be tested against the plain strings a BookingTuple carries.
 */
export const BOOKING_ATTENTION_STATUSES: readonly string[] = ['Overdue'] satisfies BookingStatus[]

export const BOOKING_OVERDUE_STATUSES: readonly string[] = ['Overdue'] satisfies BookingStatus[]

export const BOOKING_TABS = ['All', 'Upcoming', 'Today', 'Overdue'] as const
export type BookingTab = (typeof BOOKING_TABS)[number]

/** Rental length in days — bounds only; the label lives in `bookings:filters.durationBand.<value>`. */
export const BOOKING_DURATION_BANDS = [
  { value: '1-2', min: 1, max: 2 },
  { value: '3-6', min: 3, max: 6 },
  { value: '7+', min: 7, max: Infinity },
] as const
export type BookingDurationBand = (typeof BOOKING_DURATION_BANDS)[number]['value']

/** Booking total, in the company's currency. Bounds only: the label is formatted from them. */
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

/**
 * The stat cards. Deliberately unaffected by the list filters — they describe the whole book,
 * not the current view — so they come from their own endpoint rather than the loaded page.
 */
export interface BookingStats {
  openBookings: number
  startingSoon: number
  expectedRevenue: number
  needsAttention: number
  /** The two reasons a booking is not ready for pickup; both can apply to one row. */
  unpaid: number
  unsigned: number
  /** Confirmed, paid and signed — waiting only on the renter to turn up. */
  ready: number
  /** Reservations waiting for the company to confirm or decline them. */
  pending: number
  /** Unfiltered count per tab; the filtered counts come from `useBookingTabCounts`. */
  tabCounts: Record<BookingTab, number>
}

/** The statuses the list shows, which tells a declined request from a cancelled rental. */
export const BOOKING_STATUS_FILTERS = [...BOOKING_STATUSES, 'Declined'] as const
export type BookingStatusFilter = (typeof BOOKING_STATUS_FILTERS)[number]

/** Everything the list filters on. `Any`/`All`/an empty range are the "no constraint" values. */
export interface BookingFilters {
  search: string
  status: BookingStatusFilter | 'Any'
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

/** Pre-handover checks a booking records. Set when the booking was taken; not written by the form. */
export const VERIFICATION_KINDS = ['identity', 'background', 'insurance'] as const
export type VerificationKind = (typeof VERIFICATION_KINDS)[number]

/**
 * Kinds a provider answers for: Checkr for background, Axle for insurance. Identity is not one —
 * the counter matches the licence to the person in front of them.
 */
export const PROVIDER_KINDS = ['background', 'insurance'] as const satisfies readonly VerificationKind[]
export type ProviderKind = (typeof PROVIDER_KINDS)[number]

export function isProviderKind(kind: VerificationKind): kind is ProviderKind {
  return (PROVIDER_KINDS as readonly VerificationKind[]).includes(kind)
}

/**
 * Kinds the renter completes themselves, so the counter sends them a link rather than opening the
 * session here: they sign in to their insurer, which belongs on their own device, not the desk's.
 */
export const SHAREABLE_KINDS: readonly ProviderKind[] = ['insurance']

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
  /** No rate option: the cost engine picks the rates from the vehicle's card. */
  vehicleId: string
  pickupLocation: string
  returnLocation: string
  /** ISO timestamps. */
  pickupAt: string
  returnAt: string
  additionalDrivers: AdditionalDriver[]
  fees: BookingFee[]
  verifications: VerificationKind[]
  /** The terms the renter will sign. Absent, the booking follows the company's default. */
  agreementTemplateId?: string
}

/** One rate the rental was billed at, as it was when booked: "Daily × 3". */
export interface BookingRateLine {
  optionId: string
  label: string
  basis: BillingBasis
  rate: number
  count: number
  /** Set when the engine billed a day of an hourly option as this many hours. */
  cappedHours?: number
}

/** The rates as they were when booked — vehicle rate cards change afterwards. */
export interface BookingRate {
  optionId: string
  label: string
  basis: BillingBasis
  rate: number
  /** Billable units of the first line (3 days, 2 weeks, 1 fixed block). */
  units: number
  /** Across the whole rental; `null` means unlimited. */
  includedMiles: number | null
  /** Charged per mile past the included ones, as booked. Absent where the vehicle set none. */
  overageRatePerMile?: number
  /** Longest unit first; more than one when the engine combined rates. */
  lines: BookingRateLine[]
}

/** The quote as stored with the booking. The lines sum to `total`; the deposit is held, not charged. */
export interface BookingQuote {
  rentalSubtotal: number
  /** Off `rentalSubtotal`; `subtotal` is already net of it. */
  discount: { minDays: number; percentOff: number; amount: number } | null
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
  payment: BookingPayment
  paymentPreference?: PaymentPreference
  notes?: string
  declined?: BookingDecline
  contract: BookingContract
  /** The background check, when one has been ordered. Absent means it was never started. */
  verification?: BookingVerification
  /** When the company accepted it. Absent on a request still waiting, and on one it declined. */
  confirmedAt?: string
  /** When the car actually changed hands, which is not the same as the window's ends. */
  pickedUpAt?: string
  returnedAt?: string
  /** When staff closed the booking off after return. */
  completedAt?: string
  /** Absent until that handover, and on a rental handed over before readings were taken. */
  pickupCondition?: BookingCondition
  returnCondition?: BookingCondition
  createdAt: string
}

/** Everything that must be true before the counter can hand the keys over. */
export function isReadyForPickup(booking: Booking): boolean {
  // Paid exactly, matching the API's own predicate: a held deposit is not settlement, and a
  // refund undoes it. Anything looser would disagree with the "ready" count on the stat card.
  // The background check is informational and gates nothing: it reports what Checkr found,
  // and the branch reads the report and uses its own judgement.
  return booking.payment.state === 'paid' && Boolean(booking.contract.signedAt)
}

/** The five stages a rental moves through, in order. Labels live in `bookings:details.stages.<key>`. */
export const BOOKING_STAGES = ['reserved', 'confirmed', 'pickedUp', 'returned', 'closed'] as const
export type BookingStage = (typeof BOOKING_STAGES)[number]

export interface BookingStageStep {
  key: BookingStage
  /**
   * `done` is behind us, `current` is where the rental sits now, `pending` is still ahead, and
   * `skipped` never happened: the booking was declined or cancelled first.
   */
  state: 'done' | 'current' | 'pending' | 'skipped'
  /** ISO — when it happened, or when it falls due. Absent when that was never recorded. */
  at?: string
  /** How the reservation was made: by the renter online, or at the counter. Reserved only. */
  channel?: 'web' | 'counter'
}

export interface BookingCheckStep {
  /** One of VERIFICATION_KINDS; labels live in `bookings:details.checks.<key>`. */
  key: VerificationKind
  done: boolean
}

/**
 * Where a Checkr Trust instant criminal check has got to. It usually answers in the request
 * that ordered it, so `running` is the exception; `consider` means records were found and a
 * manager has to adjudicate, not that the renter was refused.
 */
export const SCREENING_STATUSES = ['running', 'clear', 'consider', 'error'] as const
export type VerificationStatus = (typeof SCREENING_STATUSES)[number]

/** Statuses Checkr will never move away from — what the details page stops polling on. */
export const TERMINAL_VERIFICATION_STATUSES: readonly VerificationStatus[] = ['clear', 'consider', 'error']

/** A background check on one booking. Absent entirely when none has been ordered. */
/** One row of the verification log: any check this tenant has run, on anyone. */
export interface VerificationRecord {
  id: string
  kind: VerificationKind
  name: string
  dateOfBirth?: string
  /** Absent for someone screened from the verification page — they are not a renter. */
  email?: string
  customerId?: string
  /** The booking that called for it, so a new insurance link lands on that booking. */
  bookingReference?: string
  /** The rental an insurance check was judged for, as `YYYY-MM-DD` dates. */
  coversFrom?: string
  coversThrough?: string
  status: VerificationStatus
  recordsFound: boolean
  hasReport: boolean
  completedAt?: string
  createdAt: string
}

/** A US postal address. All four parts or none — Checkr rejects a partial one. */
export interface VerificationAddress {
  street: string
  city: string
  state: string
  zipCode: string
}

export interface BookingVerification {
  id: string
  /** The renter the check belongs to. Absent until they book. */
  customerId?: string
  status: VerificationStatus
  /** Why a check errored, or Checkr's notes on one still running. */
  failureReason?: string
  /** Whether anything was found. The records themselves stay in Checkr. */
  recordsFound: boolean
  /** Whether there is a PDF to fetch. False while the check is still running. */
  hasReport: boolean
  /** Whether ordering again would be accepted. False while this result still stands. */
  canReorder: boolean
  /** True when this result was run for an earlier booking of the same renter. */
  reused: boolean
  /** The policy an insurance verdict was read from, once the renter has linked one. */
  policy?: { carrier?: string; policyNumber?: string; expiresOn?: string }
  /** The rental an insurance check was judged for, as `YYYY-MM-DD` dates. */
  coversFrom?: string
  coversThrough?: string
  /**
   * The renter's latest insurance check, returned because none answers this rental's dates.
   * Shown as on file, never as cover for these dates.
   */
  forOtherDates?: boolean
  completedAt?: string
  createdAt: string
  updatedAt: string
}

/**
 * One line of the charges breakdown. `extraFee` carries the label the counter typed, and a live
 * booking's `baseRate` lines the rate's own name; everything else is named by
 * `bookings:details.charges.<key>`. The lines always sum to the booking total.
 */
export interface BookingChargeLine {
  key: 'baseRate' | 'discount' | 'additionalDriver' | 'extraFee' | 'taxes'
  label?: string
  /** Interpolation values for the line's sub-caption. */
  meta?: { rate?: number; days?: number; count?: number; pct?: number; cappedHours?: number }
  amount: number
}

/** Events on the booking's audit trail. Labels live in `bookings:details.events.<key>`. */
export const BOOKING_EVENTS = [
  'created',
  'depositHold',
  'licenceUploaded',
  'confirmationSent',
  'vehicleAssigned',
] as const
export type BookingEvent = (typeof BOOKING_EVENTS)[number]

export interface BookingEventEntry {
  key: BookingEvent
  at: string
  /** Interpolation values for the event's detail line — channel, amount, plate, and so on. */
  meta?: Record<string, string | number>
}

export interface BookingRenter {
  id?: string
  name: string
  email: string
  phone: string
  licenceNumber: string
  /** Carried through for insurance verification, which matches on it. Absent on older rows. */
  dateOfBirth?: string
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
  /** When the car actually changed hands. Absent until it has. */
  pickedUpAt?: string
  returnedAt?: string
  /** Whole days, rounded: what the charge lines bill by. */
  days: number
  /** How long the rental ran once the car is back; until then, how long it is booked for. */
  duration: { days: number; hours: number; minutes: number }
  /** Across the whole rental; `null` means unlimited. */
  includedMiles: number | null
  pickupCondition?: BookingCondition
  returnCondition?: BookingCondition
  /** Miles past the allowance and their cost at the booked rate, once both ends are read. */
  overMileage?: { miles: number; amount: number }

  vehicleId?: string
  vehicleName: string
  vehiclePlate: string
  /** Cover shot from the vehicle's gallery. Absent when the car has no photos on file. */
  vehicleImage?: string
  /** "Full-size SUV · 2024 · Miami Beach". */
  vehicleSubtitle: string
  /** What the vehicle lists for today — not necessarily what this booking was charged. */
  listDailyRate: number
  /** The odometer on the vehicle's file, which the pickup form starts from. */
  vehicleMileage?: number
  /** Read for charge rather than fuel. False once the vehicle is deleted and nothing says. */
  vehicleElectric: boolean

  charges: BookingChargeLine[]
  total: number
  checks: BookingCheckStep[]
  events: BookingEventEntry[]
  renter: BookingRenter
  request?: BookingRequest
  declined?: BookingDecline
}

/**
 * A part-filled booking wizard, saved so the counter can come back to it. The payload is the
 * form's own values — the API stores it untouched and validates nothing, because a draft is
 * missing what makes a booking real. Saving one reserves no vehicle.
 */
export interface BookingDraft {
  id: string
  /** "DR-10001" — quotable while the booking is unfinished. A real BK- one lands on submit. */
  reference: string
  /** `BookingFormValues`, minus the attachments, which cannot be serialized. */
  payload: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
