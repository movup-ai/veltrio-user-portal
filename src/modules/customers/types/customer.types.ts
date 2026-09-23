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
  dateOfBirth?: string
  address?: string
  licenceNumber: string
  licenceExpiry?: string
}

/** A row in the tenant's customer book. */
export interface Customer extends CustomerInput {
  id: string
}

/** What a scan is. One of each per customer — re-uploading replaces the previous file. */
export type DocumentKind = 'licence' | 'insurance'

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
