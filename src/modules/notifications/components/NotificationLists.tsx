import { useTranslation } from 'react-i18next'
import type { Announcement, Notification } from '../types/notifications.types'
import { AnnouncementItem } from './AnnouncementItem'
import { NotificationRow } from './NotificationRow'

const LIST = 'divide-border-soft m-0 list-none divide-y p-0'

/** The same rows in the bell and on the page; each place brings its own frame and states. */
export function NotificationRows({
  notifications,
  now,
  onOpen,
}: {
  notifications: Notification[]
  now: number
  onOpen: (notification: Notification) => void
}) {
  const { t } = useTranslation('notifications')
  return (
    <ul aria-label={t('page.listLabel')} className={LIST}>
      {notifications.map((notification) => (
        <li key={notification.id}>
          <NotificationRow notification={notification} now={now} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  )
}

export function AnnouncementRows({ announcements }: { announcements: Announcement[] }) {
  return (
    <ul className={LIST}>
      {announcements.map((announcement) => (
        <li key={announcement.id}>
          <AnnouncementItem announcement={announcement} />
        </li>
      ))}
    </ul>
  )
}
