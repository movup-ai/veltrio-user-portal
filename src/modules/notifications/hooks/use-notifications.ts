import { useEffect, useRef } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'
import { useOrganizationStore } from '@/state/organization.store'
import type { PaginationParams } from '@/types/common'
import { notificationsApi } from '../api/notifications.api'
import { UNREAD_POLL_MS } from '../constants/notifications.constants'
import { unreadAnnouncementIds } from '../utils/notifications.utils'
import type {
  Announcement,
  EmailPreference,
  Notification,
  NotificationListParams,
} from '../types/notifications.types'

export const notificationKeys = {
  unread: ['notifications', 'unread-count'] as const,
  pages: ['notifications', 'page'] as const,
  page: (params: NotificationListParams) => ['notifications', 'page', params] as const,
  preferences: ['notifications', 'preferences'] as const,
  announcements: ['notifications', 'announcements'] as const,
  announcementPage: (params: PaginationParams) => ['notifications', 'announcements', params] as const,
}

/** The bell's count. Polled, since nothing pushes; a rise also refreshes any list on screen. */
export function useUnreadCount() {
  const queryClient = useQueryClient()
  // A removed member has no company to ask about, only a notice to read.
  const member = useOrganizationStore((state) => Boolean(state.membership))
  const query = useQuery({
    queryKey: notificationKeys.unread,
    queryFn: notificationsApi.unreadCount,
    enabled: member,
    refetchInterval: UNREAD_POLL_MS,
    refetchOnWindowFocus: true,
  })

  const seen = useRef<{ notifications: number; announcements: number } | undefined>(undefined)
  const { notifications, announcements } = query.data ?? {}
  useEffect(() => {
    if (notifications === undefined || announcements === undefined) return
    const before = seen.current
    if (before && notifications > before.notifications) {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.pages })
    }
    if (before && announcements > before.announcements) {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.announcements })
    }
    seen.current = { notifications, announcements }
  }, [notifications, announcements, queryClient])

  return query
}

export function useNotificationPage(params: NotificationListParams) {
  const query = useQuery({
    queryKey: notificationKeys.page(params),
    queryFn: () => notificationsApi.page(params),
    placeholderData: keepPreviousData,
  })
  return { ...query, isStale: query.isPlaceholderData }
}

export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: (counts) => {
      // The counts came back with the answer; only the lists still need reading again.
      queryClient.setQueryData(notificationKeys.unread, counts)
      void queryClient.invalidateQueries({ queryKey: notificationKeys.pages })
    },
    onError: (error) => {
      toast({
        title: i18n.t('notifications:toast.markFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}

/** Opening one reads it; the row's own link does the going. */
export function useMarkOpened() {
  const markRead = useMarkRead()
  return (notification: Notification) => {
    if (!notification.readAt) markRead.mutate({ ids: [notification.id] })
  }
}

export function useAnnouncements(params: PaginationParams) {
  const query = useQuery({
    queryKey: notificationKeys.announcementPage(params),
    queryFn: () => notificationsApi.announcements(params),
    placeholderData: keepPreviousData,
  })
  return { ...query, isStale: query.isPlaceholderData }
}

function useRefreshAnnouncements() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: notificationKeys.announcements })
    void queryClient.invalidateQueries({ queryKey: notificationKeys.unread })
  }
}

/** Announcements on screen are read once shown, so the badge clears without another click. A
 * failure only leaves the badge up, so it is silent. */
export function useReadShownAnnouncements(announcements: Announcement[] | undefined) {
  const refresh = useRefreshAnnouncements()
  const { mutate } = useMutation({ mutationFn: notificationsApi.markAnnouncementsRead, onSuccess: refresh })
  const key = unreadAnnouncementIds(announcements ?? []).join(',')
  useEffect(() => {
    if (key) mutate(key.split(','))
  }, [key, mutate])
}

export function useDismissAnnouncement() {
  const refresh = useRefreshAnnouncements()
  return useMutation({ mutationFn: notificationsApi.dismissAnnouncement, onSuccess: refresh })
}

export function useEmailPreferences() {
  return useQuery({ queryKey: notificationKeys.preferences, queryFn: notificationsApi.preferences })
}

export function useSaveEmailPreferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (preferences: EmailPreference[]) => notificationsApi.savePreferences(preferences),
    onSuccess: (saved) => {
      queryClient.setQueryData(notificationKeys.preferences, saved)
      toast({ title: i18n.t('notifications:settings.saved'), variant: 'success' })
    },
    onError: (error) => {
      toast({
        title: i18n.t('notifications:settings.saveFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}
