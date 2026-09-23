import type { PresignedUpload } from '@/modules/vehicles/api/vehicle.mapper'
import type {
  Customer,
  CustomerDocument,
  CustomerInput,
  DocumentKind,
  DocumentStatus,
} from '../types/customer.types'

/**
 * Translation layer between the portal's customer types and the FastAPI wire format. The
 * `*.api.ts` files hold URLs and HTTP; the shapes and conversions live here.
 *
 * The only real difference is absence: the API sends `null` for an unset optional field, while
 * the portal's types use `undefined`, so a blank one round-trips rather than becoming "null".
 */

// --- Wire types (mirror of the API's CustomerRead / CustomerDocumentRead) -------------------

export interface CustomerWire {
  id: string
  name: string
  email: string
  phone: string
  dateOfBirth: string | null
  address: string | null
  licenceNumber: string
  licenceExpiry: string | null
  createdAt: string
  updatedAt: string
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
    dateOfBirth: wire.dateOfBirth ?? undefined,
    address: wire.address ?? undefined,
    licenceNumber: wire.licenceNumber,
    licenceExpiry: wire.licenceExpiry ?? undefined,
  }
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
