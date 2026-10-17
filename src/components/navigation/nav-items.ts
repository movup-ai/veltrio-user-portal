import {
  CalendarCheck,
  CalendarDays,
  Car,
  CreditCard,
  FileSignature,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Permission } from '@/types/user'

/** Canonical English keys — they index into the `nav` namespace, they are not display text. */
export type NavGroupKey = 'Operations' | 'Revenue' | 'Setup' | 'Help'
export type NavLinkKey =
  | 'Dashboard'
  | 'Bookings'
  | 'Calendar'
  | 'Vehicles'
  | 'Customers'
  | 'Verification'
  | 'Payments'
  | 'Locations'
  | 'Agreements'
  | 'Users'
  | 'Settings'
  | 'Support'
  | 'Notifications'

export type NavEntry =
  | { type: 'group'; key: NavGroupKey }
  /** `permission`: shown only to roles holding it, for a page that is nothing but a notice to anyone else. */
  | { type: 'link'; key: NavLinkKey; to: string; icon: LucideIcon; permission?: Permission }

export const NAV_ITEMS: NavEntry[] = [
  { type: 'group', key: 'Operations' },
  { type: 'link', key: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { type: 'link', key: 'Bookings', to: '/bookings', icon: CalendarCheck },
  { type: 'link', key: 'Calendar', to: '/calendar', icon: CalendarDays },
  { type: 'link', key: 'Vehicles', to: '/vehicles', icon: Car },
  { type: 'link', key: 'Customers', to: '/customers', icon: Users },
  { type: 'link', key: 'Verification', to: '/verification', icon: ShieldCheck },
  { type: 'group', key: 'Revenue' },
  { type: 'link', key: 'Payments', to: '/payments', icon: CreditCard },
  { type: 'group', key: 'Setup' },
  { type: 'link', key: 'Locations', to: '/locations', icon: MapPin },
  { type: 'link', key: 'Agreements', to: '/agreements', icon: FileSignature },
  { type: 'link', key: 'Users', to: '/users', icon: UserCog, permission: 'users.manage' },
  { type: 'link', key: 'Settings', to: '/settings', icon: Settings },
  { type: 'group', key: 'Help' },
  { type: 'link', key: 'Support', to: '/support', icon: LifeBuoy },
]

/** Pages reached from the header rather than the sidebar, which still name themselves. */
const UNLISTED: { to: string; key: NavLinkKey }[] = [{ to: '/notifications', key: 'Notifications' }]

/** The nav key for a path — callers translate it via `t('nav:links.<key>')`. */
export function navKeyForPath(pathname: string): NavLinkKey {
  const match = NAV_ITEMS.find((item) => item.type === 'link' && pathname.startsWith(item.to))
  if (match && match.type === 'link') return match.key
  return UNLISTED.find((page) => pathname.startsWith(page.to))?.key ?? 'Dashboard'
}
