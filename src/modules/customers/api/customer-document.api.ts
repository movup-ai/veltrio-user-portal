import { apiClient } from '@/services/api/client'
import { vehiclePhotoApi } from '@/modules/vehicles/api/vehicle-photo.api'
import type { PresignedUpload } from '@/modules/vehicles/api/vehicle.mapper'
import { toCustomerDocument, type CustomerDocumentWire, type DocumentUploadSlotWire } from './customer.mapper'
import type { CustomerDocument, DocumentKind } from '../types/customer.types'

/**
 * A renter's licence and insurance scans. Personal data, so unlike vehicle photos nothing here
 * is ever public — the bytes go straight to private storage and come back only through a link
 * that expires in minutes.
 *
 *   1. `requestUpload`  — reserves the row, returns a presigned form
 *   2. `uploadToStorage` — the browser POSTs the file directly to storage
 *   3. `completeUpload` — confirms it landed and marks the document ready
 *
 * The presigned form pins the key, the content type and a size ceiling, so a tampered client
 * cannot put something else there or exceed what was signed for.
 */

/** Scans and photos of a document. Matches the API's allowlist — anything else is a 422. */
export const ACCEPTED_DOCUMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
] as const

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024

/** Whether a document can be rendered as a picture. A PDF gets an icon instead. */
export function isImageDocument(contentType: string): boolean {
  return contentType.startsWith('image/')
}

export interface DocumentUploadSlot {
  document: CustomerDocument
  upload: PresignedUpload
}

function documentsUrl(customerId: string): string {
  return `/customers/${customerId}/documents`
}

export const customerDocumentApi = {
  list: (customerId: string): Promise<CustomerDocument[]> =>
    apiClient
      .get<CustomerDocumentWire[]>(documentsUrl(customerId))
      .then((r) => r.data.map(toCustomerDocument)),

  requestUpload: (customerId: string, kind: DocumentKind, file: File): Promise<DocumentUploadSlot> =>
    apiClient
      .post<DocumentUploadSlotWire>(documentsUrl(customerId), {
        kind,
        name: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      })
      .then((r) => ({ document: toCustomerDocument(r.data.document), upload: r.data.upload })),

  /** The same direct-to-storage POST vehicle photos use; the presigned form is identical. */
  uploadToStorage: vehiclePhotoApi.uploadToStorage,

  completeUpload: (customerId: string, documentId: string): Promise<CustomerDocument> =>
    apiClient
      .post<CustomerDocumentWire>(`${documentsUrl(customerId)}/${documentId}/complete`)
      .then((r) => toCustomerDocument(r.data)),

  /**
   * A short-lived link to the file. Fetched on demand rather than held in state: it expires in
   * minutes, and every issue is recorded in the audit log, so it should be asked for at the
   * moment someone actually opens the document.
   *
   * `inline` asks for a link the browser will render in place — a thumbnail or a preview —
   * rather than save. Without it the file downloads.
   */
  downloadUrl: (customerId: string, documentId: string, inline = false): Promise<string> =>
    apiClient
      .get<{ url: string; expiresAt: string }>(`${documentsUrl(customerId)}/${documentId}/download`, {
        params: inline ? { inline: true } : undefined,
      })
      .then((r) => r.data.url),

  remove: (customerId: string, documentId: string): Promise<void> =>
    apiClient.delete<void>(`${documentsUrl(customerId)}/${documentId}`).then(() => undefined),
}

/**
 * Runs the three steps for one file. Returns the document once storage has it, so a caller
 * only has to await a single promise.
 */
export async function uploadCustomerDocument(
  customerId: string,
  kind: DocumentKind,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<CustomerDocument> {
  const slot = await customerDocumentApi.requestUpload(customerId, kind, file)
  await customerDocumentApi.uploadToStorage(slot.upload, file, onProgress)
  return customerDocumentApi.completeUpload(customerId, slot.document.id)
}
