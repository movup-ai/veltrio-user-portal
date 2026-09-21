import { apiClient } from '@/services/api/client'
import type { PhotoStatus } from '../types/vehicle.types'
import {
  toPhoto,
  toUploadSlot,
  type PhotoUploadSlot,
  type PhotoUploadSlotWire,
  type PresignedUpload,
  type VehiclePhotoWire,
} from './vehicle.mapper'

/**
 * Vehicle photos. Bytes never pass through the API — the browser uploads straight to storage:
 *
 *   1. `requestUploads` — reserves photo rows, returns a presigned form per file
 *   2. `uploadToStorage` — POSTs the file directly to storage
 *   3. `completeUpload`  — confirms it landed and queues processing
 *
 * The photo is `processing` when step 3 returns, `ready` once the worker finishes.
 */

export interface PhotoUploadFile {
  name: string
  contentType: string
  sizeBytes: number
}

/** Content types the API accepts. HEIC is included because iPhones shoot it by default. */
export const ACCEPTED_PHOTO_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const

export const MAX_PHOTO_BYTES = 15 * 1024 * 1024
export const MAX_PHOTOS_PER_VEHICLE = 20

export function describeFile(file: File): PhotoUploadFile {
  return { name: file.name, contentType: file.type, sizeBytes: file.size }
}

/**
 * What the photos hang off: a published vehicle, or a draft in the wizard. Both use the same
 * endpoints, keyed by owner kind in the path; publishing moves the rows to the vehicle.
 */
export type PhotoTarget =
  | { kind: 'vehicle'; id: string }
  | { kind: 'draft'; id: string }

export const vehicleTarget = (id: string): PhotoTarget => ({ kind: 'vehicle', id })
export const draftTarget = (id: string): PhotoTarget => ({ kind: 'draft', id })

function photosUrl(target: PhotoTarget): string {
  return `/vehicles/photos/${target.kind === 'draft' ? 'drafts' : 'vehicles'}/${target.id}`
}

export const vehiclePhotoApi = {
  requestUploads: (target: PhotoTarget, files: PhotoUploadFile[]): Promise<PhotoUploadSlot[]> =>
    apiClient
      .post<{ items: PhotoUploadSlotWire[] }>(photosUrl(target), { files })
      .then((r) => r.data.items.map(toUploadSlot)),

  /**
   * Sends the file to storage, reporting progress. XHR rather than fetch: only XHR exposes
   * upload progress. Form fields must be appended before the file — S3 ignores anything after.
   */
  uploadToStorage: (upload: PresignedUpload, file: File, onProgress?: (percent: number) => void) =>
    new Promise<void>((resolve, reject) => {
      const form = new FormData()
      for (const [key, value] of Object.entries(upload.fields)) form.append(key, value)
      form.append('file', file)

      const request = new XMLHttpRequest()
      request.open('POST', upload.url)
      request.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
      })
      request.addEventListener('load', () => {
        // Storage answers 204 (or 201 with a body); anything else is a rejected upload.
        if (request.status >= 200 && request.status < 300) resolve()
        else reject(new Error(`Storage rejected the upload (${request.status})`))
      })
      request.addEventListener('error', () => reject(new Error('Upload failed')))
      request.addEventListener('abort', () => reject(new Error('Upload cancelled')))
      request.send(form)
    }),

  completeUpload: (target: PhotoTarget, photoId: string) =>
    apiClient
      .post<VehiclePhotoWire>(`${photosUrl(target)}/${photoId}/complete`)
      .then((r) => toPhoto(r.data)),

  remove: (target: PhotoTarget, photoId: string) =>
    apiClient.delete<void>(`${photosUrl(target)}/${photoId}`).then((r) => r.data),

  /** Sends every photo id in display order; the first is the cover. */
  reorder: (target: PhotoTarget, photoIds: string[]) =>
    apiClient
      .put<VehiclePhotoWire[]>(`${photosUrl(target)}/order`, { photoIds })
      .then((r) => r.data.map(toPhoto)),
}

/** A photo the worker has not finished with yet — the details page polls while any remain. */
export function isPending(status: PhotoStatus | undefined): boolean {
  return status === 'uploading' || status === 'processing'
}
