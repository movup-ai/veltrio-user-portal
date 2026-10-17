import { lazy } from 'react'

export const NotificationsPage = lazy(() =>
  import('./NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
)
export const NotificationSettingsPage = lazy(() =>
  import('./NotificationSettingsPage').then((m) => ({ default: m.NotificationSettingsPage })),
)
