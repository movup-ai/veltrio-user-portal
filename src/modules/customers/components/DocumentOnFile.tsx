import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Expand, FileText, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'
import { customerDocumentApi, isImageDocument } from '../api/customer-document.api'
import type { CustomerDocument } from '../types/customer.types'

interface DocumentOnFileProps {
  customerId: string
  document: CustomerDocument
  /** Switches the slot back to the picker so a newer scan can replace this one. */
  onReplace: () => void
  className?: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * A scan the renter already has on file, shown in place of the upload slot.
 *
 * There is no lasting URL for one of these files — each view asks the API for a link that
 * expires in minutes, and every issue is recorded in the audit log. An image gets a thumbnail
 * and opens full size in a dialog; a PDF gets an icon and downloads.
 */
export function DocumentOnFile({ customerId, document, onReplace, className }: DocumentOnFileProps) {
  const { t } = useTranslation('bookings')
  const isImage = isImageDocument(document.contentType)

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  /**
   * The thumbnail's link is fetched once per document and lasts minutes, so it can expire
   * while the form sits open. A failed load falls back to the icon rather than a broken image,
   * and the full-size preview always fetches a fresh link of its own.
   */
  useEffect(() => {
    if (!isImage) return
    let cancelled = false
    customerDocumentApi
      .downloadUrl(customerId, document.id, true)
      .then((url) => {
        if (!cancelled) setThumbnailUrl(url)
      })
      .catch(() => {
        // Silent: the icon is a perfectly good fallback, and a toast per thumbnail would be noise.
      })
    return () => {
      cancelled = true
    }
  }, [customerId, document.id, isImage])

  async function open() {
    setIsBusy(true)
    try {
      const url = await customerDocumentApi.downloadUrl(customerId, document.id, isImage)
      if (isImage) setPreviewUrl(url)
      // A PDF has nothing to show in a dialog, so it goes to the browser's own viewer.
      else window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast({
        title: t('form.documents.openFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <>
      <div
        className={cn(
          'border-border bg-surface-2 flex min-h-14 items-center gap-2.5 rounded-[9px] border p-2.5',
          className,
        )}
      >
        {/* The thumbnail is the view button for an image — clicking the picture to enlarge it
            is the gesture people already expect. */}
        <button
          type="button"
          onClick={open}
          disabled={isBusy}
          aria-label={t('form.documents.view', { name: document.name })}
          className="border-border bg-surface flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[7px] border transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt=""
              className="size-full object-cover"
              onError={() => setThumbnailUrl(null)}
            />
          ) : (
            <FileText className="text-fg-4 size-4" aria-hidden />
          )}
        </button>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold">{document.name}</span>
          <span className="text-fg-4 block text-[12px]">
            {t('form.documents.onFile', { size: formatSize(document.sizeBytes) })}
          </span>
        </span>

        <button
          type="button"
          onClick={open}
          disabled={isBusy}
          aria-label={
            isImage
              ? t('form.documents.view', { name: document.name })
              : t('form.documents.download', { name: document.name })
          }
          className="text-fg-4 hover:bg-surface-3 hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-[7px] transition-colors disabled:opacity-50"
        >
          {/* The icon says what will happen: an image opens in a dialog, anything else
              (a PDF) is handed to the browser to download. */}
          {isImage ? <Expand className="size-4" /> : <Download className="size-4" />}
        </button>
        <button
          type="button"
          onClick={onReplace}
          aria-label={t('form.documents.replace', { name: document.name })}
          className="text-fg-4 hover:bg-surface-3 hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-[7px] transition-colors"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>

      <Dialog open={previewUrl != null} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        {/* Wider than the default dialog and sized to the image: a licence photographed in
            landscape is unreadable squeezed into a form-width box. */}
        <DialogContent className="max-w-3xl gap-3 p-4">
          <DialogTitle className="pr-8 truncate text-[14.5px]">{document.name}</DialogTitle>
          {previewUrl && (
            <img
              src={previewUrl}
              alt={document.name}
              className="max-h-[70vh] w-full rounded-[7px] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
