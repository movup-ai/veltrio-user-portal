import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeApiError } from '@/services/api/errors'
import { vehiclePhotoApi, MAX_PHOTOS_PER_VEHICLE, type PhotoTarget } from '../api/vehicle-photo.api'
import { describeFile, screenPhotos } from '../utils/photo-files'

/**
 * Drives presign → upload → complete for a set of files, a few at a time — twenty parallel
 * uploads saturate the connection and every progress bar crawls together, which reads as a hang.
 */
const CONCURRENCY = 3

export type UploadPhase = 'queued' | 'uploading' | 'completing' | 'done' | 'failed'

export interface PhotoUpload {
  /** Stable key for React; the server photo id once presigning has happened. */
  key: string
  photoId?: string
  name: string
  /** Local object URL, so a preview appears before the upload finishes. */
  previewUrl: string
  phase: UploadPhase
  progress: number
  error?: string
}

export interface StartUploadsResult {
  uploaded: number
  failed: number
  /** Why each refused file was refused, naming it; uploads that fail in flight are counted only. */
  problems: string[]
}

/**
 * Uploads files without any progress UI, for the one case that has none: files picked before
 * the wizard was ever saved, which upload as soon as the first "Save & exit" creates the draft.
 * Rejections are reported to the caller rather than shown per tile.
 */
export async function uploadPhotos(
  target: PhotoTarget,
  files: File[],
  existingCount = 0,
): Promise<StartUploadsResult> {
  const { accepted, problems } = screenPhotos(files, MAX_PHOTOS_PER_VEHICLE - existingCount)
  if (accepted.length === 0) return { uploaded: 0, failed: problems.length, problems }

  const slots = await vehiclePhotoApi.requestUploads(target, accepted.map(describeFile))
  let uploaded = 0
  let failed = problems.length
  let next = 0

  const runOne = async (index: number) => {
    const slot = slots[index]
    const file = accepted[index]
    if (!slot || !file) return
    try {
      await vehiclePhotoApi.uploadToStorage(slot.upload, file)
      await vehiclePhotoApi.completeUpload(target, slot.photo.id)
      uploaded += 1
    } catch {
      failed += 1
    }
  }

  const worker = async () => {
    while (next < slots.length) await runOne(next++)
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, slots.length) }, worker))
  return { uploaded, failed, problems }
}

export function useVehiclePhotoUpload(target: PhotoTarget | undefined) {
  const [uploads, setUploads] = useState<PhotoUpload[]>([])
  // Object URLs are revoked on unmount; holding them in a ref keeps cleanup out of render.
  const previewUrls = useRef<string[]>([])

  useEffect(() => {
    const urls = previewUrls.current
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  const patch = useCallback((key: string, changes: Partial<PhotoUpload>) => {
    setUploads((current) => current.map((u) => (u.key === key ? { ...u, ...changes } : u)))
  }, [])

  const clearFinished = useCallback(() => {
    setUploads((current) => current.filter((u) => u.phase !== 'done'))
  }, [])

  const start = useCallback(
    async (files: File[], existingCount: number): Promise<StartUploadsResult> => {
      if (!target || files.length === 0) return { uploaded: 0, failed: 0, problems: [] }

      const { accepted, problems } = screenPhotos(files, MAX_PHOTOS_PER_VEHICLE - existingCount)
      if (problems.length > 0) {
        // Surfaced by the caller — the hook stays UI-free so it can be tested on its own.
        setUploads((current) => [
          ...current,
          ...problems.map((message, index) => ({
            key: `rejected-${Date.now()}-${index}`,
            name: message,
            previewUrl: '',
            phase: 'failed' as const,
            progress: 0,
            error: message,
          })),
        ])
      }
      if (accepted.length === 0) return { uploaded: 0, failed: problems.length, problems }

      const queued: PhotoUpload[] = accepted.map((file, index) => {
        const previewUrl = URL.createObjectURL(file)
        previewUrls.current.push(previewUrl)
        return {
          key: `upload-${Date.now()}-${index}`,
          name: file.name,
          previewUrl,
          phase: 'queued',
          progress: 0,
        }
      })
      setUploads((current) => [...current, ...queued])

      // One presign call for the whole batch: it also enforces the 20-photo cap server-side.
      let slots
      try {
        slots = await vehiclePhotoApi.requestUploads(target, accepted.map(describeFile))
      } catch (error) {
        const message = normalizeApiError(error).message
        queued.forEach((u) => patch(u.key, { phase: 'failed', error: message }))
        return { uploaded: 0, failed: accepted.length + problems.length, problems }
      }

      let uploaded = 0
      let failed = problems.length
      let next = 0

      const runOne = async (index: number) => {
        const slot = slots[index]
        const entry = queued[index]
        const file = accepted[index]
        if (!slot || !entry) return

        patch(entry.key, { phase: 'uploading', photoId: slot.photo.id, progress: 0 })
        try {
          await vehiclePhotoApi.uploadToStorage(slot.upload, file, (percent) =>
            patch(entry.key, { progress: percent }),
          )
          patch(entry.key, { phase: 'completing', progress: 100 })
          await vehiclePhotoApi.completeUpload(target, slot.photo.id)
          patch(entry.key, { phase: 'done' })
          uploaded += 1
        } catch (error) {
          failed += 1
          patch(entry.key, {
            phase: 'failed',
            error: error instanceof Error ? error.message : normalizeApiError(error).message,
          })
        }
      }

      const worker = async () => {
        while (next < slots.length) await runOne(next++)
      }
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, slots.length) }, worker))

      return { uploaded, failed, problems }
    },
    // Identity, not the object: a caller building the target inline would otherwise rebuild
    // `start` on every render. The two fields are the whole of what `target` contributes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [target?.kind, target?.id, patch],
  )

  return { uploads, start, clearFinished, isUploading: uploads.some((u) => u.phase === 'uploading' || u.phase === 'completing') }
}
