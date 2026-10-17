import type { Language } from '@/i18n'
import type { MembershipRole } from '@/types/user'
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_KINDS,
  type Announcement,
  type Notification,
  type NotificationCategory,
  type NotificationKind,
} from '../types/notifications.types'

export const NOTIFICATIONS_PATH = '/notifications'
export const NOTIFICATION_SETTINGS_PATH = '/notifications/settings'

function isKind(kind: string): kind is NotificationKind {
  return (NOTIFICATION_KINDS as readonly string[]).includes(kind)
}

/** The text's key. A kind this build does not know still reads as something, not a raw slug. */
export function notificationKey(kind: string): `kinds.${NotificationKind}` | 'kinds.unknown' {
  return isKind(kind) ? `kinds.${kind}` : 'kinds.unknown'
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

/** What the text is filled with. Money and roles are worded by the caller, in its language. */
export function notificationValues(
  notification: Notification,
  word: { money: (cents: number) => string; role: (role: string) => string },
): Record<string, string> {
  const { params } = notification
  const values: Record<string, string> = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, text(value)]),
  )
  if (typeof params.amountCents === 'number') values.amount = word.money(params.amountCents)
  if (typeof params.role === 'string') values.role = word.role(params.role)
  return values
}

/** The page a notification opens, or none for one whose subject has no page. */
export function notificationLink(notification: Notification): string | undefined {
  switch (notification.entityType) {
    case 'booking':
      return typeof notification.params.reference === 'string'
        ? `/bookings/${encodeURIComponent(notification.params.reference)}`
        : undefined
    case 'support_ticket':
      return `/support/${notification.entityId}`
    case 'invitation':
      return '/users'
    case 'tenant':
      return '/settings/billing'
    default:
      return undefined
  }
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
]

/** "5 minutes ago", "yesterday". Undefined past a week, where a date reads better. */
export function relativeTime(at: string, now: number, locale: string): string | undefined {
  const elapsed = now - Date.parse(at)
  if (elapsed >= 7 * 86_400_000) return undefined
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  for (const [unit, size] of UNITS) {
    if (elapsed >= size) return format.format(-Math.floor(elapsed / size), unit)
  }
  return format.format(0, 'minute')
}

/** The filter's choices: billing notifications go to owners only, so others never have one. */
export function categoriesFor(role: MembershipRole | undefined): NotificationCategory[] {
  return NOTIFICATION_CATEGORIES.filter((category) => category !== 'billing' || role === 'owner')
}

export type EmptyNotifications = 'none' | 'caughtUp' | 'category'

/** Why the list is empty, so it can say so and offer the way out: the filter before the tab. */
export function emptyNotifications(filters: {
  unread: boolean
  category?: NotificationCategory
}): EmptyNotifications {
  if (filters.category) return 'category'
  return filters.unread ? 'caughtUp' : 'none'
}

/** Spanish when it was written, English otherwise: Veltrio writes one language at a time. */
export function announcementText(
  announcement: Announcement,
  language: Language,
): { title: string; body: string } {
  const { es: title } = announcement.title
  const { es: body } = announcement.body
  return language === 'es' && title && body
    ? { title, body }
    : { title: announcement.title.en, body: announcement.body.en }
}

/** The maintenance notice to show as a banner: the newest one this member has not dismissed. */
export function bannerAnnouncement(announcements: Announcement[]): Announcement | undefined {
  return announcements.find((announcement) => announcement.kind === 'maintenance' && !announcement.dismissed)
}

export function unreadAnnouncementIds(announcements: Announcement[]): string[] {
  return announcements.filter((announcement) => !announcement.read).map((announcement) => announcement.id)
}

/** The bell's badge. Past nine it stops counting: the number no longer changes what anyone does. */
export function badgeLabel(count: number): string | undefined {
  if (count <= 0) return undefined
  return count > 9 ? '9+' : String(count)
}
