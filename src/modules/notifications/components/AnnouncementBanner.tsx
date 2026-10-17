import { Wrench, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFormatters } from '@/i18n'
import { useAnnouncements, useDismissAnnouncement } from '../hooks/use-notifications'
import { announcementText, bannerAnnouncement } from '../utils/notifications.utils'

// Only the newest few are looked at: a maintenance notice is current or has been ended.
const RECENT = { page: 1, pageSize: 10 }

/** A maintenance notice from Veltrio, above every page until this member dismisses it. */
export function AnnouncementBanner() {
  const { t } = useTranslation('notifications')
  const format = useFormatters()
  const { data } = useAnnouncements(RECENT)
  const dismiss = useDismissAnnouncement()
  const announcement = bannerAnnouncement(data?.items ?? [])
  if (!announcement) return null
  const { title, body } = announcementText(announcement, format.language)

  return (
    <div role="status" className="bg-warning-tint text-fg-2 flex items-start gap-3 px-6 py-2.5 text-[13px]">
      <Wrench className="text-warning mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="m-0 min-w-0 flex-1" style={{ overflowWrap: 'anywhere' }}>
        <span className="text-foreground font-semibold">{title}</span> {body}
      </p>
      <button
        type="button"
        aria-label={t('announcement.dismiss')}
        disabled={dismiss.isPending}
        onClick={() => dismiss.mutate(announcement.id)}
        className="text-fg-3 hover:text-foreground focus-visible:outline-ring -my-0.5 rounded p-0.5 focus-visible:outline-2"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
