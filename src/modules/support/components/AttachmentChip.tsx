import { useState } from 'react'
import { FileText, ImageIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'
import { formatFileSize } from '@/utils/formatting'
import type { TicketAttachment } from '../types/support.types'

/** A file sent with a message. `getUrl` asks for a fresh link: they expire in minutes. */
export function AttachmentChip({
  attachment,
  getUrl,
}: {
  attachment: TicketAttachment
  getUrl: () => Promise<string>
}) {
  const { t } = useTranslation('support')
  const [opening, setOpening] = useState(false)
  const Icon = attachment.contentType.startsWith('image/') ? ImageIcon : FileText

  async function open() {
    // Opened in the click itself: a tab opened after the link arrives is blocked as a pop-up.
    const tab = window.open('', '_blank')
    setOpening(true)
    try {
      const url = await getUrl()
      if (tab) {
        tab.opener = null
        tab.location.href = url
      } else {
        const link = document.createElement('a')
        link.href = url
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        link.click()
      }
    } catch (error) {
      tab?.close()
      toast({
        title: t('attachments.openFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    } finally {
      setOpening(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void open()}
      disabled={opening}
      aria-label={t('attachments.open', { name: attachment.name })}
      className="border-border bg-surface hover:bg-surface-2 focus-visible:outline-ring flex max-w-[280px] items-center gap-2 rounded-[9px] border px-2.5 py-1.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
    >
      <Icon className="text-fg-3 size-4 shrink-0" aria-hidden />
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold">{attachment.name}</span>
        <span className="text-fg-4 block text-[11.5px]">{formatFileSize(attachment.sizeBytes)}</span>
      </span>
    </button>
  )
}
