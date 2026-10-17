import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, ImageOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ImagePreviewDialog } from '@/components/feedback/ImagePreviewDialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { TicketAttachment } from '../types/support.types'
import { isPreviewableImage } from '../utils/support.utils'
import { AttachmentChip } from './AttachmentChip'

// A link lasts five minutes; reused for four, so a thumbnail never points at an expired one.
const LINK_REUSE_MS = 4 * 60_000

/**
 * The files sent with one message: pictures as thumbnails that open full size, anything else as
 * a chip that opens in a new tab.
 */
export function MessageAttachments({
  attachments,
  getUrl,
}: {
  attachments: TicketAttachment[]
  getUrl: (attachmentId: string) => Promise<string>
}) {
  if (attachments.length === 0) return null
  const pictures = attachments.filter((attachment) => isPreviewableImage(attachment.contentType))
  const files = attachments.filter((attachment) => !isPreviewableImage(attachment.contentType))

  return (
    <div className="mt-2 flex flex-col gap-2">
      {pictures.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {pictures.map((attachment) => (
            <li key={attachment.id}>
              <Thumbnail attachment={attachment} getUrl={() => getUrl(attachment.id)} />
            </li>
          ))}
        </ul>
      )}
      {files.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {files.map((attachment) => (
            <li key={attachment.id}>
              <AttachmentChip attachment={attachment} getUrl={() => getUrl(attachment.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Thumbnail({ attachment, getUrl }: { attachment: TicketAttachment; getUrl: () => Promise<string> }) {
  const { t } = useTranslation('support')
  const [open, setOpen] = useState(false)
  const link = useQuery({
    queryKey: ['support-attachment-url', attachment.id],
    queryFn: getUrl,
    staleTime: LINK_REUSE_MS,
    gcTime: LINK_REUSE_MS,
  })
  const tile =
    'border-border bg-surface-2 flex size-[104px] items-center justify-center overflow-hidden rounded-[10px] border'

  if (link.isPending) return <Skeleton className="size-[104px] rounded-[10px]" />
  if (!link.data) {
    return (
      <span className={tile} title={attachment.name}>
        <ImageOff
          className="text-fg-4 size-5"
          aria-label={t('attachments.previewFailed', { name: attachment.name })}
        />
      </span>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('attachments.preview', { name: attachment.name })}
        className={`${tile} focus-visible:outline-ring hover:border-border-strong transition-colors focus-visible:outline-2 focus-visible:outline-offset-2`}
      >
        <img src={link.data} alt="" className="size-full object-cover" />
      </button>
      <ImagePreviewDialog
        open={open}
        onOpenChange={setOpen}
        name={attachment.name}
        src={link.data}
        action={
          <a
            href={link.data}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary flex shrink-0 items-center gap-1.5 text-[13px] font-medium hover:underline"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            {t('attachments.openOriginal')}
          </a>
        }
      />
    </>
  )
}
