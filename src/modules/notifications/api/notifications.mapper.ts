import type {
  Announcement,
  AnnouncementAttachment,
  AnnouncementKind,
  EmailPreference,
  Notification,
  NotificationCategory,
  NotificationEntity,
  UnreadCount,
} from '../types/notifications.types'

export interface NotificationWire {
  id: string
  kind: string
  category: NotificationCategory
  entityType: NotificationEntity
  entityId: string
  params: Record<string, unknown>
  createdAt: string
  readAt: string | null
}

export type UnreadCountWire = UnreadCount

export type EmailPreferenceWire = EmailPreference

export interface AnnouncementWire {
  id: string
  kind: AnnouncementKind
  titleEn: string
  bodyEn: string
  titleEs: string | null
  bodyEs: string | null
  linkUrl: string | null
  publishAt: string
  attachments: AnnouncementAttachment[]
  read: boolean
  dismissed: boolean
}

export function toNotification({ readAt, ...rest }: NotificationWire): Notification {
  return { ...rest, readAt: readAt ?? undefined }
}

export function toAnnouncement(wire: AnnouncementWire): Announcement {
  return {
    id: wire.id,
    kind: wire.kind,
    title: { en: wire.titleEn, es: wire.titleEs ?? undefined },
    body: { en: wire.bodyEn, es: wire.bodyEs ?? undefined },
    linkUrl: wire.linkUrl ?? undefined,
    publishAt: wire.publishAt,
    attachments: wire.attachments,
    read: wire.read,
    dismissed: wire.dismissed,
  }
}
