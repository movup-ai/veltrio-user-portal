import type { PaginationParams } from '@/types/common'

/** How often the bell asks for its count. Paused while the tab is hidden. */
export const UNREAD_POLL_MS = 60_000

/** What the bell's popover shows; the rest is a click away on the notifications page. */
export const BELL_PAGE: PaginationParams = { page: 1, pageSize: 10 }

/** The API deletes older ones (app/modules/notifications/service.py, KEEP_FOR). */
export const KEPT_FOR_DAYS = 90
