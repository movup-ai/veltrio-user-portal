/** [name, email, phone, licence, rentals, lifetimeValue, status] */
export type CustomerTuple = [
  name: string,
  email: string,
  phone: string,
  licence: string,
  rentals: string,
  lifetimeValue: string,
  status: string,
]

/** A renter's details as typed into a form. Dates are YYYY-MM-DD. */
export interface CustomerInput {
  name: string
  email: string
  phone: string
  dateOfBirth: string
  address?: string
  licenceNumber: string
  licenceExpiry?: string
}

/** As the customer says, never guessed. `undisclosed` is them preferring not to say. */
export const GENDERS = ['female', 'male', 'nonBinary', 'undisclosed'] as const
export type Gender = (typeof GENDERS)[number]

/**
 * A customer as the customers page files them. The booking form's renter step does not ask
 * a gender, and the API refuses one there, so it lives here and not on `CustomerInput`.
 */
export interface CustomerProfileInput extends CustomerInput {
  gender?: Gender
}

/** A row in the tenant's customer book. */
export interface Customer extends CustomerProfileInput {
  id: string
}

/** A customer as the customers page lists them. `lifetimeValue` is dollars. */
export interface CustomerRow extends Customer {
  /** Bookings that went ahead: not a request still waiting, and not a cancelled one. */
  rentals: number
  lifetimeValue: number
  possibleDuplicate: boolean
}

/** What a customer on file shares with a renter being typed in. Strongest first. */
export const MATCH_REASONS = ['email', 'licence', 'nameAndDob', 'phone'] as const
export type MatchReason = (typeof MATCH_REASONS)[number]

export interface CustomerMatch {
  customer: Customer
  reasons: MatchReason[]
}

export interface CustomerDetail extends CustomerRow {
  duplicates: CustomerMatch[]
}

export interface CustomerStats {
  total: number
  /** Customers with at least one rental: who a repeat rate is measured over. */
  rented: number
  /** Customers with more than one rental. */
  repeat: number
  possibleDuplicates: number
}

export const CUSTOMER_SORTS = ['newest', 'oldest', 'name', 'valueDesc', 'valueAsc', 'rentalsDesc'] as const
export type CustomerSort = (typeof CUSTOMER_SORTS)[number]

export interface CustomerListParams {
  search: string
  sort: CustomerSort
  page: number
  pageSize: number
}

/** As much of a renter as has been typed so far. */
export interface CustomerMatchInput extends Partial<CustomerInput> {
  /** The customer being edited, who would otherwise match themselves. */
  excludeId?: string
}

/** The save refusals that name a customer already on file. */
export const CUSTOMER_CONFLICT_CODES = [
  'customer_email_taken',
  'customer_licence_on_file',
  'customer_details_differ',
] as const
export type CustomerConflictCode = (typeof CUSTOMER_CONFLICT_CODES)[number]

export interface CustomerConflict {
  code: CustomerConflictCode
  customer: Customer
}

/** What a scan is. One of each per customer — re-uploading replaces the previous file. */
export const DOCUMENT_KINDS = ['licence', 'insurance'] as const
export type DocumentKind = (typeof DOCUMENT_KINDS)[number]

/** `uploading` means a slot was reserved but the file has not landed yet. */
export type DocumentStatus = 'uploading' | 'ready'

/**
 * A licence or insurance scan on file. Metadata only: the bytes are private, reachable
 * solely through a short-lived signed link (see customer-document.api.ts).
 */
export interface CustomerDocument {
  id: string
  kind: DocumentKind
  status: DocumentStatus
  name: string
  contentType: string
  sizeBytes: number
  createdAt: string
}

/** A scan the customer sent with a reservation of their own: theirs, not the company's copy. */
export interface CustomerBookingDocument extends CustomerDocument {
  bookingReference: string
}
