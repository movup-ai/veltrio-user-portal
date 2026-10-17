export const NOTIFICATION_CATEGORIES = [
  'bookings',
  'payments',
  'contracts',
  'support',
  'team',
  'billing',
] as const
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]

/** Mirrors the API's catalog (app/modules/notifications/catalog.py). */
export const NOTIFICATION_KINDS = [
  'booking_requested',
  'booking_overdue',
  'booking_cancelled',
  'booking_declined',
  'booking_dates_changed',
  'booking_vehicle_swapped',
  'payment_received',
  'payment_failed',
  'extension_paid',
  'deposit_held',
  'deposit_lapsed',
  'contract_signed',
  'ticket_replied',
  'ticket_closed',
  'invitation_accepted',
  'subscription_past_due',
  'credits_low',
  'credits_recharge_failed',
] as const
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]

export type NotificationEntity = 'booking' | 'support_ticket' | 'invitation' | 'tenant'

export interface Notification {
  id: string
  /** A string, not `NotificationKind`: an API newer than this build can send one it does not know. */
  kind: string
  category: NotificationCategory
  entityType: NotificationEntity
  entityId: string
  params: Record<string, unknown>
  createdAt: string
  readAt?: string
}

export interface UnreadCount {
  notifications: number
  announcements: number
}

/** The categories with an email switch; in-app is always on. */
export type SwitchableCategory = Extract<NotificationCategory, 'bookings' | 'payments' | 'contracts'>

export interface EmailPreference {
  category: SwitchableCategory
  email: boolean
}

export type AnnouncementKind = 'release' | 'maintenance' | 'notice'

export interface AnnouncementAttachment {
  id: string
  name: string
  contentType: string
  sizeBytes: number
}

export interface Announcement {
  id: string
  kind: AnnouncementKind
  title: { en: string; es?: string }
  body: { en: string; es?: string }
  linkUrl?: string
  publishAt: string
  attachments: AnnouncementAttachment[]
  read: boolean
  dismissed: boolean
}

export interface NotificationListParams {
  page: number
  pageSize: number
  unread?: boolean
  category?: NotificationCategory
}
