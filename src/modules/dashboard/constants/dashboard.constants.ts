import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarX2,
  ClockAlert,
  FileWarning,
  Inbox,
  type LucideIcon,
} from 'lucide-react'

/** How often the open dashboard re-reads its figures. */
export const DASHBOARD_REFRESH_MS = 60_000

/** The dashboard's booking lists: today's movements, then the to-do lists. */
export type ListKey = 'pickups' | 'returns' | 'overdue' | 'requests' | 'missed' | 'notReady'

/** One icon per list, shared by its card and its empty state so the two never disagree. */
export const LIST_ICON: Record<ListKey, LucideIcon> = {
  pickups: ArrowUpRight,
  returns: ArrowDownLeft,
  overdue: ClockAlert,
  requests: Inbox,
  missed: CalendarX2,
  notReady: FileWarning,
}
