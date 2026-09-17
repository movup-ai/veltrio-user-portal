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

/**
 * Pickup-window presets, anchored on "today". A preset rather than a date-range picker because
 * the mock windows carry no year — swap for real dates once bookings come from the API.
 */
export const BOOKING_PICKUP_RANGES = ['any', 'next7', 'next14', 'next30', 'past7', 'past30'] as const
export type BookingPickupRange = (typeof BOOKING_PICKUP_RANGES)[number]

/** Everything the list filters on. `Any`/`All`/`any` are the "no constraint" values. */
export interface BookingFilters {
  search: string
  status: BookingStatus | 'Any'
  location: string | 'All'
  pickup: BookingPickupRange
  make: string | 'All'
  durationBand: BookingDurationBand | 'Any'
  valueBands: BookingValueBand[]
}

/** The two sets the list is built from. Mirrors the shape the bookings API will eventually return. */
export interface BookingLists {
  upcoming: BookingTuple[]
  recent: BookingTuple[]
}

/** Renter on the booking — either picked from the customer book or typed in fresh. */
export interface BookingCustomer {
  name: string
  email: string
  phone: string
  licence: string
}

/** Optional add-ons, billed per rental day. Labels live in `bookings:extras.<key>`. */
export const BOOKING_EXTRAS = [
  { key: 'additionalDriver', pricePerDay: 12 },
  { key: 'childSeat', pricePerDay: 9 },
  { key: 'gpsUnit', pricePerDay: 7 },
  { key: 'roadsideAssist', pricePerDay: 6 },
] as const
export type BookingExtraKey = (typeof BOOKING_EXTRAS)[number]['key']

export function bookingExtra(key: BookingExtraKey) {
  return BOOKING_EXTRAS.find((e) => e.key === key)
}

/** Payload for creating a booking — the server assigns reference/status/createdAt. */
export interface BookingInput {
  customer: BookingCustomer
  vehicleId: string
  rateOptionId: string
  /**
   * Vehicle name and plate are denormalized onto the booking so the list can render a row
   * without joining against the fleet — and so the row still reads correctly after the
   * vehicle is renamed or archived.
   */
  vehicleName: string
  vehiclePlate: string
  pickupLocation: string
  returnLocation: string
  /** ISO timestamps. */
  pickupAt: string
  returnAt: string
  extras: BookingExtraKey[]
  notes?: string
  /** Snapshot of the charge at booking time — rates can change afterwards. */
  total: number
}

export interface Booking extends BookingInput {
  reference: string
  status: BookingStatus
  createdAt: string
}
