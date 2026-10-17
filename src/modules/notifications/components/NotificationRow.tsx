import {
  Banknote,
  CalendarCheck,
  ChevronRight,
  CreditCard,
  FileSignature,
  LifeBuoy,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useFormatters } from '@/i18n'
import { fromCents } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { Notification, NotificationCategory } from '../types/notifications.types'
import {
  notificationKey,
  notificationLink,
  notificationValues,
  relativeTime,
} from '../utils/notifications.utils'

const CATEGORY_ICONS: Record<NotificationCategory, LucideIcon> = {
  bookings: CalendarCheck,
  payments: Banknote,
  contracts: FileSignature,
  support: LifeBuoy,
  team: UserPlus,
  billing: CreditCard,
}

interface NotificationRowProps {
  notification: Notification
  now: number
  onOpen: (notification: Notification) => void
}

export function NotificationRow({ notification, now, onOpen }: NotificationRowProps) {
  const { t } = useTranslation('notifications')
  const { t: tNav } = useTranslation('nav')
  const format = useFormatters()
  const Icon = CATEGORY_ICONS[notification.category] ?? CalendarCheck
  const unread = !notification.readAt

  const values = notificationValues(notification, {
    money: (cents) => format.currency(fromCents(cents)),
    role: (role) =>
      role === 'owner' || role === 'manager' || role === 'staff' ? tNav(`sidebar.roles.${role}`) : role,
  })
  const when =
    relativeTime(notification.createdAt, now, format.locale) ?? format.dateTime(notification.createdAt)
  const link = notificationLink(notification)
  const className =
    'group hover:bg-surface-2 focus-visible:outline-ring flex w-full items-start gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2'

  const content = (
    <>
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full',
          unread ? 'bg-primary-solid text-solid-foreground' : 'bg-surface-2 text-fg-4',
        )}
      >
        <Icon className="size-3.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-[13px]',
            unread ? 'text-foreground font-semibold' : 'text-fg-2 font-medium',
          )}
          style={{ overflowWrap: 'anywhere' }}
        >
          {t(notificationKey(notification.kind), { replace: values })}
        </span>
        <span className="text-fg-4 block text-[11.5px]">
          {when} · {t(`categories.${notification.category}`)}
        </span>
      </span>
      {unread && (
        <span className="bg-primary-solid mt-2 size-2 shrink-0 rounded-full">
          <span className="sr-only">{t('row.unread')}</span>
        </span>
      )}
      {link && (
        <ChevronRight
          className="text-fg-4 group-hover:text-foreground size-4 shrink-0 self-center transition-colors"
          aria-hidden
        />
      )}
    </>
  )

  // A link where there is a page, so it opens in a new tab like any other and shows where it goes.
  return link ? (
    <Link to={link} onClick={() => onOpen(notification)} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={() => onOpen(notification)} className={className}>
      {content}
    </button>
  )
}
