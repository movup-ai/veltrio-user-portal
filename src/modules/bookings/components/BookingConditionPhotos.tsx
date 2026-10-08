import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { CONDITION_PHOTO_TYPES } from '../constants/booking.constants'
import type { ConditionPhoto } from '../types/booking.types'

interface BookingConditionPhotosProps {
  /** A recorded handover's photos, or a form's own: either way a name and an address to show. */
  photos: Pick<ConditionPhoto, 'id' | 'name' | 'url'>[]
  /** Both present on a handover form; without them the photos are read-only. */
  onAdd?: (files: File[]) => void
  onRemove?: (id: string) => void
}

/** One handover's photos as tiles, each opening full size in its own tab. */
export function BookingConditionPhotos({ photos, onAdd, onRemove }: BookingConditionPhotosProps) {
  const { t } = useTranslation('bookings')
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  if (!onAdd && photos.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {photos.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {photos.map((photo) => (
            <li key={photo.id} className="relative">
              <a
                href={photo.url}
                target="_blank"
                rel="noreferrer"
                aria-label={t('details.condition.photos.open', { name: photo.name })}
                className="border-border bg-surface-2 block size-20 overflow-hidden rounded-[10px] border"
              >
                <img src={photo.url} alt="" loading="lazy" className="size-full object-cover" />
              </a>
              {onRemove && (
                <button
                  type="button"
                  aria-label={t('details.condition.photos.remove', { name: photo.name })}
                  onClick={() => onRemove(photo.id)}
                  className="bg-foreground/60 text-background hover:bg-foreground absolute top-1 right-1 flex size-5 items-center justify-center rounded-full transition-colors"
                >
                  <X className="size-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {onAdd && (
        // The same slot the licence and insurance uploads use, so adding a file looks one way.
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            onAdd(Array.from(event.dataTransfer.files))
          }}
          className={cn(
            'flex min-h-14 items-center gap-2.5 rounded-[9px] border border-dashed p-2.5 text-left transition-colors',
            dragging ? 'border-primary bg-tint' : 'border-border-strong hover:bg-surface-2',
          )}
        >
          <ImagePlus className="text-fg-4 ml-1 size-4 shrink-0" aria-hidden />
          <span className="min-w-0">
            <span className="block text-[13.5px] font-semibold">{t('details.condition.photos.add')}</span>
            <span className="text-fg-4 block text-[12px]">{t('details.condition.photos.hint')}</span>
          </span>
        </button>
      )}
      {onAdd && (
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={CONDITION_PHOTO_TYPES.join(',')}
          className="hidden"
          onChange={(event) => {
            onAdd(Array.from(event.target.files ?? []))
            event.target.value = ''
          }}
        />
      )}
    </div>
  )
}
