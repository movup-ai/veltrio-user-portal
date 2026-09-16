import { useRef, useState } from 'react'
import { GripVertical, ImagePlus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/use-toast'
import type { VehiclePhoto } from '@/modules/vehicles/types/vehicle.types'

const MAX_FILE_SIZE_MB = 15

interface PhotoDropzoneProps {
  value: VehiclePhoto[]
  onChange: (photos: VehiclePhoto[]) => void
  max?: number
  className?: string
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function PhotoDropzone({ value, onChange, max = 10, className }: PhotoDropzoneProps) {
  const { t } = useTranslation('vehicles')
  const [isDragging, setIsDragging] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return

    const remaining = max - value.length
    if (remaining <= 0) {
      toast({ title: t('photos.limitReached'), description: t('photos.limitReachedDescription', { max }), variant: 'error' })
      return
    }

    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
    const oversized = files.filter((f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024)
    const accepted = files.filter((f) => f.size <= MAX_FILE_SIZE_MB * 1024 * 1024).slice(0, remaining)

    if (oversized.length > 0) {
      toast({ title: t('photos.skipped'), description: t('photos.skippedDescription', { size: MAX_FILE_SIZE_MB }), variant: 'error' })
    }
    if (files.length > remaining) {
      toast({ title: t('photos.limitReached'), description: t('photos.limitPartial', { added: remaining, max }), variant: 'error' })
    }

    const uploaded = await Promise.all(
      accepted.map(async (file) => ({
        id: crypto.randomUUID(),
        url: await readAsDataUrl(file),
        name: file.name,
      })),
    )

    onChange([...value, ...uploaded])
  }

  const reorder = (from: number, to: number) => {
    if (from === to) return
    const next = [...value]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          void addFiles(e.dataTransfer.files)
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[9px] border border-dashed px-6 py-10 text-center transition-colors',
          isDragging ? 'border-primary bg-tint' : 'border-border-strong hover:bg-surface-2',
        )}
      >
        <ImagePlus className="text-fg-4 size-6" />
        <p className="text-[13px] font-semibold">{t('photos.dropzone')}</p>
        <p className="text-fg-4 text-[12px]">
          {t('photos.dropzoneHint', { max, size: MAX_FILE_SIZE_MB, used: value.length })}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {value.length > 0 && (
        <>
          <p className="text-fg-4 mt-3 text-[12px]">{t('photos.coverHint')}</p>
          <div className="mt-2 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
            {value.map((photo, index) => (
              <div
                key={photo.id}
                draggable
                onDragStart={(e) => {
                  setDraggedIndex(index)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnter={() => {
                  if (draggedIndex !== null && draggedIndex !== index) setDropTargetIndex(index)
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={() => {
                  setDraggedIndex(null)
                  setDropTargetIndex(null)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (draggedIndex !== null) reorder(draggedIndex, index)
                  setDraggedIndex(null)
                  setDropTargetIndex(null)
                }}
                className={cn(
                  'border-border group relative aspect-square cursor-grab overflow-hidden rounded-[9px] border active:cursor-grabbing',
                  draggedIndex === index && 'opacity-40',
                  dropTargetIndex === index && draggedIndex !== index && 'outline-primary outline-2 -outline-offset-2',
                )}
              >
                <img src={photo.url} alt={photo.name} className="pointer-events-none size-full object-cover" />

                {index === 0 && (
                  <span className="bg-foreground/70 text-background absolute top-1 left-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold">
                    {t('photos.cover')}
                  </span>
                )}

                <span className="bg-foreground/70 text-background pointer-events-none absolute bottom-1 left-1 flex size-5 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100">
                  <GripVertical className="size-3" />
                </span>

                <button
                  type="button"
                  aria-label={t('photos.remove', { name: photo.name })}
                  onClick={() => onChange(value.filter((p) => p.id !== photo.id))}
                  className="bg-foreground/70 text-background absolute top-1 right-1 flex size-5 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
