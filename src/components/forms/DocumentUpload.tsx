import { useRef, useState } from 'react'
import { Download, Expand, FileText, Paperclip, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import type { UploadedFile } from '@/types/common'

const MAX_FILE_SIZE_MB = 10
const DEFAULT_ACCEPT = 'image/*,application/pdf'

interface DocumentUploadProps {
  value: UploadedFile | null
  onChange: (file: UploadedFile | null) => void
  /** Names the slot in the empty state and the remove button — e.g. "Driving licence". */
  label: string
  accept?: string
  id?: string
  className?: string
}

/**
 * Preview only, and only valid on this page. An object URL keeps the bytes out of React state
 * — a base64 data URL of a 10 MB scan is ~13 MB of string re-rendered on every keystroke, and
 * it would end up inside any draft the form serializes.
 */
function previewUrl(file: File): string {
  return URL.createObjectURL(file)
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Shared by both states so attaching a file doesn't resize the slot — otherwise the field
 * beside it jumps out of alignment the moment one of the two is filled.
 */
const SLOT = 'flex min-h-14 items-center gap-2.5 rounded-[9px] p-2.5'

/** Single-file attachment slot — a scan or photo of one document. Swap the file by removing it first. */
export function DocumentUpload({
  value,
  onChange,
  label,
  accept = DEFAULT_ACCEPT,
  id,
  className,
}: DocumentUploadProps) {
  const { t } = useTranslation('common')
  const [isDragging, setIsDragging] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function accept_(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({
        title: t('upload.tooLarge'),
        description: t('upload.tooLargeDescription', { size: MAX_FILE_SIZE_MB }),
        variant: 'error',
      })
      return
    }

    // The slot only accepts a file when it is empty, but release any previous URL anyway:
    // an object URL that is overwritten rather than revoked pins its file in memory for the
    // life of the page.
    if (value) URL.revokeObjectURL(value.url)
    onChange({ id: crypto.randomUUID(), name: file.name, url: previewUrl(file), size: file.size, file })
  }

  if (value) {
    const isImage = value.file.type.startsWith('image/')
    return (
      <div className={cn(SLOT, 'border-border bg-surface-2 border', className)}>
        <span className="border-border bg-surface flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[7px] border">
          {isImage ? (
            <img src={value.url} alt="" className="size-full object-cover" />
          ) : (
            <FileText className="text-fg-4 size-4" aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold">{value.name}</span>
          <span className="text-fg-4 block text-[12px]">{formatSize(value.size)}</span>
        </span>
        {/* An image opens full size; anything else (a PDF) is handed to the browser.
            The file is local, so this needs no network round trip. */}
        {isImage ? (
          <button
            type="button"
            aria-label={t('upload.preview', { label })}
            onClick={() => setIsPreviewing(true)}
            className="text-fg-4 hover:bg-surface-3 hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-[7px] transition-colors"
          >
            <Expand className="size-4" />
          </button>
        ) : (
          <a
            href={value.url}
            download={value.name}
            aria-label={t('upload.download', { label })}
            className="text-fg-4 hover:bg-surface-3 hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-[7px] transition-colors"
          >
            <Download className="size-4" />
          </a>
        )}
        <button
          type="button"
          aria-label={t('upload.remove', { label })}
          onClick={() => {
            // The object URL pins the file in memory until it is released.
            URL.revokeObjectURL(value.url)
            onChange(null)
          }}
          className="text-fg-4 hover:bg-surface-3 hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-[7px] transition-colors"
        >
          <X className="size-4" />
        </button>

        <Dialog open={isPreviewing} onOpenChange={setIsPreviewing}>
          {/* Wider than the default dialog and sized to the image: a licence photographed in
              landscape is unreadable squeezed into a form-width box. */}
          <DialogContent className="max-w-3xl gap-3 p-4">
            <DialogTitle className="truncate pr-8 text-[14.5px]">{value.name}</DialogTitle>
            <img
              src={value.url}
              alt={value.name}
              className="max-h-[70vh] w-full rounded-[7px] object-contain"
            />
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      id={id}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        accept_(e.dataTransfer.files)
      }}
      className={cn(
        SLOT,
        'cursor-pointer border border-dashed transition-colors',
        isDragging ? 'border-primary bg-tint' : 'border-border-strong hover:bg-surface-2',
        className,
      )}
    >
      <Paperclip className="text-fg-4 size-4 shrink-0" aria-hidden />
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold">{t('upload.prompt')}</span>
        <span className="text-fg-4 block text-[12px]">{t('upload.hint', { size: MAX_FILE_SIZE_MB })}</span>
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          accept_(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
