import { useRef, useState } from 'react'
import { FileText, Paperclip, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
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

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
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
export function DocumentUpload({ value, onChange, label, accept = DEFAULT_ACCEPT, id, className }: DocumentUploadProps) {
  const { t } = useTranslation('common')
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function accept_(fileList: FileList | null) {
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

    onChange({ id: crypto.randomUUID(), name: file.name, url: await readAsDataUrl(file), size: file.size })
  }

  if (value) {
    const isImage = value.url.startsWith('data:image/')
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
        <button
          type="button"
          aria-label={t('upload.remove', { label })}
          onClick={() => onChange(null)}
          className="text-fg-4 hover:bg-surface-3 hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-[7px] transition-colors"
        >
          <X className="size-4" />
        </button>
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
        void accept_(e.dataTransfer.files)
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
          void accept_(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
