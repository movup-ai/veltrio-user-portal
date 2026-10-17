import { useRef, useState } from 'react'
import { Download, Expand, FileText, Paperclip, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { usePreviewRef } from '@/lib/use-preview-ref'
import { ImagePreviewDialog } from '@/components/feedback/ImagePreviewDialog'
import { toast } from '@/components/ui/use-toast'
import type { UploadedFile } from '@/types/common'
import { formatFileSize } from '@/utils/formatting'

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
  const previewRef = usePreviewRef(value?.file)

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

    onChange({ id: crypto.randomUUID(), name: file.name, size: file.size, file })
  }

  if (value) {
    const isImage = value.file.type.startsWith('image/')
    return (
      <div className={cn(SLOT, 'border-border bg-surface-2 border', className)}>
        <span className="border-border bg-surface flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[7px] border">
          {isImage ? (
            <img ref={previewRef} alt="" className="size-full object-cover" />
          ) : (
            <FileText className="text-fg-4 size-4" aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold">{value.name}</span>
          <span className="text-fg-4 block text-[11.5px]">{formatFileSize(value.size)}</span>
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
            ref={previewRef}
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
          onClick={() => onChange(null)}
          className="text-fg-4 hover:bg-surface-3 hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-[7px] transition-colors"
        >
          <X className="size-4" />
        </button>

        <ImagePreviewDialog
          open={isPreviewing}
          onOpenChange={setIsPreviewing}
          name={value.name}
          imageRef={previewRef}
        />
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
        <span className="block text-[13px] font-semibold">{t('upload.prompt')}</span>
        <span className="text-fg-4 block text-[11.5px]">{t('upload.hint', { size: MAX_FILE_SIZE_MB })}</span>
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
