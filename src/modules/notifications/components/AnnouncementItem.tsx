import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ToneBadge } from '@/components/data-display/ToneBadge'
import { useFormatters } from '@/i18n'
import type { Tone } from '@/lib/tone'
import { MessageAttachments } from '@/modules/support/components/MessageAttachments'
import { notificationsApi } from '../api/notifications.api'
import type { Announcement, AnnouncementKind } from '../types/notifications.types'
import { announcementText } from '../utils/notifications.utils'

const KIND_TONES: Record<AnnouncementKind, Tone> = {
  release: 'success',
  maintenance: 'warning',
  notice: 'info',
}

export function AnnouncementItem({ announcement }: { announcement: Announcement }) {
  const { t } = useTranslation('notifications')
  const format = useFormatters()
  const { title, body } = announcementText(announcement, format.language)

  return (
    <article className="flex flex-col gap-1.5 px-4 py-3.5">
      <div className="flex items-center gap-2">
        <ToneBadge tone={KIND_TONES[announcement.kind]}>
          {t(`announcement.kinds.${announcement.kind}`)}
        </ToneBadge>
        <span className="text-fg-4 text-[11.5px]">
          {format.date(announcement.publishAt, { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
      <h3 className="text-foreground m-0 text-[13.5px] font-semibold">{title}</h3>
      {/* Plain text from the admin dashboard: its line breaks are the only formatting it has. */}
      <p className="text-fg-2 m-0 text-[13px] whitespace-pre-line" style={{ overflowWrap: 'anywhere' }}>
        {body}
      </p>
      <MessageAttachments
        attachments={announcement.attachments}
        getUrl={(attachmentId) => notificationsApi.attachmentUrl(announcement.id, attachmentId)}
      />
      {announcement.linkUrl && (
        <a
          href={announcement.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex w-fit items-center gap-1 text-[12.5px] font-semibold hover:underline"
        >
          {t('announcement.learnMore')}
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      )}
    </article>
  )
}
