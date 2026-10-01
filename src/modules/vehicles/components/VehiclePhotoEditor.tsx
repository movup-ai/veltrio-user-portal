import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { GripVertical, ImagePlus, Loader2, X } from 'lucide-react'
import { cn, moveItem } from '@/lib/utils'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'
import {
  ACCEPTED_PHOTO_TYPES,
  MAX_PHOTOS_PER_VEHICLE,
  vehiclePhotoApi,
  type PhotoTarget,
} from '../api/vehicle-photo.api'
import { useVehiclePhotoUpload, type PhotoUpload } from '../hooks/use-photo-upload'
import { vehicleKeys } from '../hooks/use-vehicles'
import { vehicleDraftKeys } from '../hooks/use-vehicle-drafts'
import { photoThumbnail } from '../utils/vehicle.utils'
import type { VehiclePhoto } from '../types/vehicle.types'

/**
 * Photo management for an existing vehicle: add, reorder, remove.
 *
 * Only used on the Edit page. Unlike the wizard's dropzone, every action here hits the API
 * immediately — the vehicle already exists, so there is nothing to defer until save, and a
 * deleted photo really is gone whether or not the form is submitted afterwards.
 */
interface Props {
  target: PhotoTarget
  photos: VehiclePhoto[]
}

function UploadTile({ upload }: { upload: PhotoUpload }) {
  const { t } = useTranslation('vehicles')
  const failed = upload.phase === 'failed'

  return (
    <div
      title={failed ? upload.error : undefined}
      className={cn(
        'bg-surface-2 relative aspect-square overflow-hidden rounded-[9px] border',
        failed ? 'border-error/50' : 'border-border',
      )}
    >
      {upload.previewUrl && (
        <img src={upload.previewUrl} alt="" className="size-full object-cover opacity-40" draggable={false} />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center">
        {failed ? (
          <span className="text-error text-[10px] font-semibold">{t('photos.failed')}</span>
        ) : (
          <>
            <Loader2 className="text-fg-2 size-4 animate-spin" aria-hidden />
            {/* The percentage is real information; the processing phase is just the spinner. */}
            {upload.phase !== 'completing' && (
              <span className="text-fg-2 text-[10px] font-semibold">{upload.progress}%</span>
            )}
          </>
        )}
      </div>
      {!failed && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10">
          <div
            className="bg-primary h-full transition-[width] duration-200"
            style={{ width: `${upload.phase === 'completing' ? 100 : upload.progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

export function VehiclePhotoEditor({ target, photos }: Props) {
  const { t } = useTranslation('vehicles')
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const { uploads, start, clearFinished, isUploading } = useVehiclePhotoUpload(target)

  const pendingUploads = uploads.filter((u) => u.phase !== 'done')
  const canAdd = photos.length + pendingUploads.length < MAX_PHOTOS_PER_VEHICLE

  // A draft's photos are not in the vehicle detail cache; they are fetched with the draft.
  const refreshVehicle = () =>
    queryClient.invalidateQueries({
      queryKey: target.kind === 'draft' ? vehicleDraftKeys.all : vehicleKeys.detail(target.id),
    })

  const handleFiles = async (list: FileList | File[] | null) => {
    const files = list ? Array.from(list) : []
    if (files.length === 0) return
    const result = await start(files, photos.length)
    if (result.uploaded > 0) {
      await refreshVehicle()
      clearFinished()
      toast({ title: t('photos.uploadSummary', { count: result.uploaded }), variant: 'success' })
    }
    if (result.failed > 0) toast({ title: t('photos.uploadFailed'), variant: 'error' })
  }

  const handleRemove = async (photo: VehiclePhoto) => {
    try {
      await vehiclePhotoApi.remove(target, photo.id)
      await refreshVehicle()
      toast({ title: t('photos.deleted'), variant: 'success' })
    } catch (error) {
      toast({ title: t('photos.deleteFailed'), description: normalizeApiError(error).message, variant: 'error' })
    }
  }

  const handleReorder = async (from: number, to: number) => {
    if (from === to) return
    const next = moveItem(photos, from, to)

    // Optimistic: dragging has to feel immediate, and the server returns the same order.
    // Drafts render from the prop, which the parent already updated, so only vehicles need this.
    if (target.kind === 'vehicle') {
      queryClient.setQueryData(vehicleKeys.detail(target.id), (current: unknown) =>
        current && typeof current === 'object' ? { ...current, photos: next } : current,
      )
    }
    try {
      await vehiclePhotoApi.reorder(target, next.map((p) => p.id))
    } catch (error) {
      toast({ title: t('photos.reorderFailed'), description: normalizeApiError(error).message, variant: 'error' })
    } finally {
      await refreshVehicle()
    }
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => canAdd && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && canAdd && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          void handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-[9px] border border-dashed px-6 py-10 text-center transition-colors',
          canAdd ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
          isDragging ? 'border-primary bg-tint' : 'border-border-strong hover:bg-surface-2',
        )}
      >
        <ImagePlus className="text-fg-4 size-6" />
        <p className="text-[13px] font-semibold">{t('photos.dropzone')}</p>
        <p className="text-fg-4 text-[12px]">
          {t('photos.dropzoneHint', { max: MAX_PHOTOS_PER_VEHICLE, size: 15, used: photos.length })}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_PHOTO_TYPES.join(',')}
          className="hidden"
          disabled={isUploading}
          onChange={(e) => {
            void handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {(photos.length > 0 || pendingUploads.length > 0) && (
        <>
          <p className="text-fg-4 mt-3 text-[12px]">{t('photos.coverHint')}</p>
          <div className="mt-2 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDropIndex(index)
                }}
                onDragEnd={() => {
                  if (dragIndex !== null && dropIndex !== null) void handleReorder(dragIndex, dropIndex)
                  setDragIndex(null)
                  setDropIndex(null)
                }}
                className={cn(
                  'border-border group relative aspect-square cursor-grab overflow-hidden rounded-[9px] border active:cursor-grabbing',
                  dragIndex === index && 'opacity-40',
                  dropIndex === index && dragIndex !== index && 'outline-primary outline-2 -outline-offset-2',
                )}
              >
                {photo.url ? (
                  <img
                    src={photoThumbnail(photo)}
                    alt={photo.name}
                    className="pointer-events-none size-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <span
                    role="status"
                    aria-label={t('photos.processing')}
                    className="bg-surface-2 text-fg-4 flex size-full items-center justify-center"
                  >
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  </span>
                )}

                {index === 0 && (
                  <span className="bg-foreground/70 text-background pointer-events-none absolute top-1 left-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold">
                    {t('photos.cover')}
                  </span>
                )}
                <span className="bg-foreground/70 text-background pointer-events-none absolute bottom-1 left-1 flex size-5 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100">
                  <GripVertical className="size-3" />
                </span>
                <button
                  type="button"
                  aria-label={t('photos.remove', { name: photo.name })}
                  onClick={() => void handleRemove(photo)}
                  className="bg-foreground/70 text-background absolute top-1 right-1 flex size-5 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}

            {pendingUploads.map((upload) => (
              <UploadTile key={upload.key} upload={upload} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
