import { lazy } from 'react'

export const SupportPage = lazy(() => import('./SupportPage').then((m) => ({ default: m.SupportPage })))
export const SupportTicketPage = lazy(() =>
  import('./SupportTicketPage').then((m) => ({ default: m.SupportTicketPage })),
)
