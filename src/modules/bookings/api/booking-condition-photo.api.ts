import { apiClient } from '@/services/api/client'
import { vehiclePhotoApi } from '@/modules/vehicles/api/vehicle-photo.api'
import type { ConditionPhoto, ConditionStage } from '../types/booking.types'
import { toConditionPhoto, type ConditionPhotoSlotWire, type ConditionPhotoWire } from './booking.mapper'

/**
 * Photos of the car at pickup and at return. Private, and uploaded the way customer documents
 * are: reserve a row, post the file straight to storage, then confirm it landed. The API takes
 * them only until that handover is recorded.
 */

function photosUrl(reference: string): string {
  return `/bookings/${reference}/condition-photos`
}

export const conditionPhotoApi = {
  list: (reference: string): Promise<ConditionPhoto[]> =>
    apiClient.get<ConditionPhotoWire[]>(photosUrl(reference)).then((r) => r.data.map(toConditionPhoto)),

  requestUpload: (reference: string, stage: ConditionStage, file: File): Promise<ConditionPhotoSlotWire> =>
    apiClient
      .post<ConditionPhotoSlotWire>(photosUrl(reference), {
        stage,
        name: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      })
      .then((r) => r.data),

  completeUpload: (reference: string, photoId: string): Promise<ConditionPhoto> =>
    apiClient
      .post<ConditionPhotoWire>(`${photosUrl(reference)}/${photoId}/complete`)
      .then((r) => toConditionPhoto(r.data)),

  remove: (reference: string, photoId: string): Promise<void> =>
    apiClient.delete<void>(`${photosUrl(reference)}/${photoId}`).then(() => undefined),
}

/** Runs the three steps for one file, so a caller awaits a single promise. */
export async function uploadConditionPhoto(
  reference: string,
  stage: ConditionStage,
  file: File,
): Promise<ConditionPhoto> {
  const slot = await conditionPhotoApi.requestUpload(reference, stage, file)
  try {
    await vehiclePhotoApi.uploadToStorage(slot.upload, file)
    return await conditionPhotoApi.completeUpload(reference, slot.id)
  } catch (error) {
    // A reserved photo counts towards the handover's limit until the API expires it a day later.
    await conditionPhotoApi.remove(reference, slot.id).catch(() => undefined)
    throw error
  }
}
