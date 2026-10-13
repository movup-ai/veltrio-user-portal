import { isAxiosError } from 'axios'
import { fromCents } from '@/lib/money'
import { toLimitOffset } from '@/lib/pagination'
import type { PresignedUpload } from '@/modules/vehicles/api/vehicle.mapper'
import { normalizeApiError } from '@/services/api/errors'
import {
  CUSTOMER_CONFLICT_CODES,
  type Customer,
  type CustomerConflict,
  type CustomerDetail,
  type CustomerBookingDocument,
  type CustomerDocument,
  type CustomerInput,
  type CustomerListParams,
  type CustomerMatch,
  type CustomerMatchInput,
  type CustomerProfileInput,
  type CustomerRow,
  type DocumentKind,
  type DocumentStatus,
  type Gender,
  type MatchReason,
} from '../types/customer.types'

/**
 * Translation layer between the portal's customer types and the FastAPI wire format. The
 * `*.api.ts` files hold URLs and HTTP; the shapes and conversions live here.
 *
 * The only real difference is absence: the API sends `null` for an unset optional field, while
 * the portal's types use `undefined`, so a blank one round-trips rather than becoming "null".
 */

// --- Wire types (mirror of the API's CustomerRead / CustomerDocumentRead) -------------------

type GenderWire = 'female' | 'male' | 'non_binary' | 'undisclosed'

const GENDER: Record<GenderWire, Gender> = {
  female: 'female',
  male: 'male',
  non_binary: 'nonBinary',
  undisclosed: 'undisclosed',
}

const GENDER_WIRE: Record<Gender, GenderWire> = {
  female: 'female',
  male: 'male',
  nonBinary: 'non_binary',
  undisclosed: 'undisclosed',
}

export interface CustomerWire {
  id: string
  name: string
  email: string
  phone: string
  dateOfBirth: string
  address: string | null
  licenceNumber: string
  licenceExpiry: string | null
  gender: GenderWire | null
  createdAt: string
  updatedAt: string
}

export interface CustomerRowWire extends CustomerWire {
  rentals: number
  lifetimeValueCents: number
  possibleDuplicate: boolean
}

type MatchReasonWire = 'email' | 'licence' | 'name_and_dob' | 'phone'

export interface CustomerMatchWire {
  customer: CustomerWire
  reasons: MatchReasonWire[]
}

export interface CustomerDetailWire extends CustomerRowWire {
  duplicates: CustomerMatchWire[]
}

export interface CustomerDocumentWire {
  id: string
  kind: DocumentKind
  status: DocumentStatus
  name: string
  contentType: string
  sizeBytes: number
  createdAt: string
}

export interface DocumentUploadSlotWire {
  document: CustomerDocumentWire
  upload: PresignedUpload
}

// --- Reads ---------------------------------------------------------------------------------

export function toCustomer(wire: CustomerWire): Customer {
  return {
    id: wire.id,
    name: wire.name,
    email: wire.email,
    phone: wire.phone,
    dateOfBirth: wire.dateOfBirth,
    address: wire.address ?? undefined,
    licenceNumber: wire.licenceNumber,
    licenceExpiry: wire.licenceExpiry ?? undefined,
    gender: wire.gender ? GENDER[wire.gender] : undefined,
  }
}

export function toCustomerRow(wire: CustomerRowWire): CustomerRow {
  return {
    ...toCustomer(wire),
    rentals: wire.rentals,
    lifetimeValue: fromCents(wire.lifetimeValueCents),
    possibleDuplicate: wire.possibleDuplicate,
  }
}

const MATCH_REASON: Record<MatchReasonWire, MatchReason> = {
  email: 'email',
  licence: 'licence',
  name_and_dob: 'nameAndDob',
  phone: 'phone',
}

export function toCustomerMatch(wire: CustomerMatchWire): CustomerMatch {
  return { customer: toCustomer(wire.customer), reasons: wire.reasons.map((r) => MATCH_REASON[r]) }
}

export function toCustomerDetail(wire: CustomerDetailWire): CustomerDetail {
  return { ...toCustomerRow(wire), duplicates: wire.duplicates.map(toCustomerMatch) }
}

/**
 * The customer a refused save says is already on file, or undefined for any other failure.
 * Read off the raw response: `normalizeApiError` keeps the code but not `details`.
 */
export function toCustomerConflict(error: unknown): CustomerConflict | undefined {
  const { code, cause } = normalizeApiError(error)
  const conflict = CUSTOMER_CONFLICT_CODES.find((known) => known === code)
  if (!conflict || !isAxiosError(cause)) return undefined
  const wire = (cause.response?.data as { error?: { details?: { customer?: CustomerWire } } })?.error?.details
    ?.customer
  return wire ? { code: conflict, customer: toCustomer(wire) } : undefined
}

export function toCustomerDocument(wire: CustomerDocumentWire): CustomerDocument {
  return {
    id: wire.id,
    kind: wire.kind,
    status: wire.status,
    name: wire.name,
    contentType: wire.contentType,
    sizeBytes: wire.sizeBytes,
    createdAt: wire.createdAt,
  }
}

export type CustomerBookingDocumentWire = CustomerDocumentWire & { bookingReference: string }

export function toCustomerBookingDocument(wire: CustomerBookingDocumentWire): CustomerBookingDocument {
  return { ...toCustomerDocument(wire), bookingReference: wire.bookingReference }
}

// --- Writes --------------------------------------------------------------------------------

/** Blank optional fields go over as null: the API treats "" as a value, not an absence. */
export function toCustomerPayload(input: CustomerInput) {
  return {
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    dateOfBirth: input.dateOfBirth || null,
    address: input.address?.trim() || null,
    licenceNumber: input.licenceNumber.trim(),
    licenceExpiry: input.licenceExpiry || null,
  }
}

/** The customers page's own save: the booking form's payload must not carry a gender. */
export function toCustomerProfilePayload(input: CustomerProfileInput) {
  return { ...toCustomerPayload(input), gender: input.gender ? GENDER_WIRE[input.gender] : null }
}

/** Blank fields are left out: the API matches on what was typed, and "" is not a value. */
export function toCustomerMatchPayload(input: CustomerMatchInput) {
  return {
    name: input.name?.trim() || undefined,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    dateOfBirth: input.dateOfBirth || undefined,
    licenceNumber: input.licenceNumber?.trim() || undefined,
    excludeId: input.excludeId,
  }
}

export function toCustomerListQuery(params: CustomerListParams) {
  return {
    ...toLimitOffset(params),
    search: params.search.trim() || undefined,
    sort: params.sort,
  }
}
