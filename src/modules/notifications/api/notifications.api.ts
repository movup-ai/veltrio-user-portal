import { toLimitOffset, toPaginatedResult, type ListEnvelope } from '@/lib/pagination'
import { apiClient } from '@/services/api/client'
import type { PaginatedResult, PaginationParams } from '@/types/common'
import type {
  Announcement,
  EmailPreference,
  Notification,
  NotificationListParams,
  UnreadCount,
} from '../types/notifications.types'
import {
  toAnnouncement,
  toNotification,
  type AnnouncementWire,
  type EmailPreferenceWire,
  type NotificationWire,
  type UnreadCountWire,
} from './notifications.mapper'

export const notificationsApi = {
  page: (params: NotificationListParams): Promise<PaginatedResult<Notification>> =>
    apiClient
      .get<ListEnvelope<NotificationWire>>('/notifications', {
        params: { unread: params.unread || undefined, category: params.category, ...toLimitOffset(params) },
      })
      .then((r) => toPaginatedResult(r.data.items.map(toNotification), r.data.total, params)),

  unreadCount: (): Promise<UnreadCount> =>
    apiClient.get<UnreadCountWire>('/notifications/unread-count').then((r) => r.data),

  /** The `ids` given, or every unread one with `all`. Answers with the counts that are left. */
  markRead: (target: { ids: string[] } | { all: true }): Promise<UnreadCount> =>
    apiClient.post<UnreadCountWire>('/notifications/read', target).then((r) => r.data),

  preferences: (): Promise<EmailPreference[]> =>
    apiClient.get<EmailPreferenceWire[]>('/notifications/preferences').then((r) => r.data),

  savePreferences: (preferences: EmailPreference[]): Promise<EmailPreference[]> =>
    apiClient.put<EmailPreferenceWire[]>('/notifications/preferences', preferences).then((r) => r.data),

  announcements: (params: PaginationParams): Promise<PaginatedResult<Announcement>> =>
    apiClient
      .get<ListEnvelope<AnnouncementWire>>('/announcements', { params: toLimitOffset(params) })
      .then((r) => toPaginatedResult(r.data.items.map(toAnnouncement), r.data.total, params)),

  markAnnouncementsRead: (ids: string[]): Promise<void> =>
    apiClient.post('/announcements/read', { ids }).then(() => undefined),

  dismissAnnouncement: (id: string): Promise<void> =>
    apiClient.post(`/announcements/${id}/dismiss`).then(() => undefined),

  /** A link that expires in minutes, so it is asked for when the file is shown or opened. */
  attachmentUrl: (announcementId: string, attachmentId: string): Promise<string> =>
    apiClient
      .get<{ url: string }>(`/announcements/${announcementId}/attachments/${attachmentId}/download`, {
        params: { inline: true },
      })
      .then((r) => r.data.url),
}
