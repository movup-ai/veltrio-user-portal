import { useId, useRef, useState } from 'react'
import { AlertCircle, Expand, ExternalLink, FileText, Loader2, Paperclip, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ImagePreviewDialog } from '@/components/feedback/ImagePreviewDialog'
import { cn } from '@/lib/utils'
import { usePreviewRef } from '@/lib/use-preview-ref'
import { formatFileSize } from '@/utils/formatting'
import { ACCEPTED_ATTACHMENT_TYPES } from '../constants/support.constants'
import type { AttachmentUploads, PendingAttachment } from '../hooks/use-attachment-uploads'
import { isPreviewableImage } from '../utils/support.utils'

export function AttachmentPicker({ uploads, disabled }: { uploads: AttachmentUploads; disabled?: boolean }) {
  const { t } = useTranslation('support')
  const input = useRef<HTMLInputElement>(null)
  const hintId = useId()

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-describedby={hintId}
          onClick={() => input.current?.click()}
        >
          <Paperclip className="size-4" aria-hidden />
          {t('attachments.attach')}
        </Button>
        <span id={hintId} className="text-description">
          {t('attachments.hint')}
        </span>
        <input
          ref={input}
          type="file"
          multiple
          hidden
          accept={ACCEPTED_ATTACHMENT_TYPES.join(',')}
          onChange={(event) => {
            uploads.add(Array.from(event.target.files ?? []))
            // Cleared so the same file can be picked again after it is removed.
            event.target.value = ''
          }}
        />
      </div>

      {uploads.refused && (
        <p role="alert" className="text-error m-0 text-[13px]">
          {t(`attachments.refused.${uploads.refused.problem}`, { name: uploads.refused.name })}
        </p>
      )}

      {uploads.items.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {uploads.items.map((item) => (
            <PendingRow key={item.key} item={item} onRemove={() => uploads.remove(item.key)} />
          ))}
        </ul>
      )}
    </div>
  )
}

function PendingRow({ item, onRemove }: { item: PendingAttachment; onRemove: () => void }) {
  const { t } = useTranslation('support')
  const [previewing, setPreviewing] = useState(false)
  // The picked file itself, not the upload: it can be checked before it has finished sending.
  const previewRef = usePreviewRef(item.file)
  const failed = item.status === 'failed'
  const picture = isPreviewableImage(item.file.type)
  const detail =
    item.status === 'uploading'
      ? t('attachments.uploading', { progress: Math.round(item.progress) })
      : failed
        ? (item.error ?? t('attachments.failed'))
        : formatFileSize(item.file.size)
  const iconButton =
    'text-fg-4 hover:bg-surface-3 hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-[7px] transition-colors'

  return (
    <li
      className={cn(
        'flex items-center gap-2.5 rounded-[9px] border px-2.5 py-2',
        failed ? 'border-error bg-error-tint' : 'border-border bg-surface-2',
      )}
    >
      <span className="border-border bg-surface relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[7px] border">
        {picture && !failed ? (
          <img ref={previewRef} alt="" className="size-full object-cover" />
        ) : failed ? (
          <AlertCircle className="text-error size-4" aria-hidden />
        ) : (
          <FileText className="text-fg-4 size-4" aria-hidden />
        )}
        {item.status === 'uploading' && (
          <span className="bg-surface/70 absolute inset-0 flex items-center justify-center">
            <Loader2 className="text-fg-2 size-4 animate-spin" aria-hidden />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold">{item.file.name}</span>
        <span className={cn('block text-[11.5px]', failed ? 'text-error' : 'text-fg-4')}>{detail}</span>
      </span>
      {!failed &&
        (picture ? (
          <button
            type="button"
            aria-label={t('attachments.preview', { name: item.file.name })}
            onClick={() => setPreviewing(true)}
            className={iconButton}
          >
            <Expand className="size-4" aria-hidden />
          </button>
        ) : (
          <a
            ref={previewRef}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('attachments.open', { name: item.file.name })}
            className={iconButton}
          >
            <ExternalLink className="size-4" aria-hidden />
          </a>
        ))}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label={t('attachments.remove', { name: item.file.name })}
        onClick={onRemove}
      >
        <X className="size-4" aria-hidden />
      </Button>
      {picture && (
        <ImagePreviewDialog
          open={previewing}
          onOpenChange={setPreviewing}
          name={item.file.name}
          imageRef={previewRef}
        />
      )}
    </li>
  )
}
