import type { PhotoUpload } from '../hooks/use-photo-upload'
import type { VehiclePhoto } from '../types/vehicle.types'

/**
 * Uploads that still need a tile of their own: everything the vehicle's photo list does not
 * hold yet. A finished upload keeps its tile until a reload lists its photo, so the grid never
 * drops a picture it has just shown and brings it back a moment later.
 */
export function unlistedUploads(uploads: PhotoUpload[], photos: Pick<VehiclePhoto, 'id'>[]): PhotoUpload[] {
  const listed = new Set(photos.map((photo) => photo.id))
  return uploads.filter((upload) => !upload.photoId || !listed.has(upload.photoId))
}

/**
 * This session's local previews by photo id, so a listed photo the server is still processing
 * keeps its picture instead of going blank, and its thumbnail can load over it.
 */
export function previewsByPhoto(uploads: PhotoUpload[]): Map<string, string> {
  return new Map(
    uploads.flatMap((upload) =>
      upload.photoId && upload.previewUrl ? [[upload.photoId, upload.previewUrl]] : [],
    ),
  )
}
