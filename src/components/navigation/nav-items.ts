import {
  CalendarCheck,
  CalendarDays,
  Car,
  CreditCard,
  FileSignature,
  LayoutDashboard,
  MapPin,
  Settings,
  ShieldCheck,
  Tag,
  Users,
  type LucideIcon,
} from 'lucide-react'

/** Canonical English keys — they index into the `nav` namespace, they are not display text. */
export type NavGroupKey = 'Operations' | 'Revenue' | 'Setup'
export type NavLinkKey = 'Dashboard' | 'Bookings' | 'Calendar' | 'Vehicles' | 'Customers' | 'Verification' | 'Payments' | 'Pricing' | 'Locations' | 'Agreements' | 'Settings'

export type NavEntry =
  | { type: 'group'; key: NavGroupKey }
  | { type: 'link'; key: NavLinkKey; to: string; icon: LucideIcon; badge?: string; urgent?: boolean }

export const NAV_ITEMS: NavEntry[] = [
  { type: 'group', key: 'Operations' },
  { type: 'link', key: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { type: 'link', key: 'Bookings', to: '/bookings', icon: CalendarCheck },
  { type: 'link', key: 'Calendar', to: '/calendar', icon: CalendarDays },
  { type: 'link', key: 'Vehicles', to: '/vehicles', icon: Car },
  { type: 'link', key: 'Customers', to: '/customers', icon: Users },
  { type: 'link', key: 'Verification', to: '/verification', icon: ShieldCheck },
  { type: 'group', key: 'Revenue' },
  { type: 'link', key: 'Payments', to: '/payments', icon: CreditCard, badge: '2', urgent: true },
  { type: 'link', key: 'Pricing', to: '/pricing', icon: Tag },
  { type: 'group', key: 'Setup' },
  { type: 'link', key: 'Locations', to: '/locations', icon: MapPin },
  { type: 'link', key: 'Agreements', to: '/agreements', icon: FileSignature },
  { type: 'link', key: 'Settings', to: '/settings', icon: Settings },
]

/** The nav key for a path — callers translate it via `t('nav:links.<key>')`. */
export function navKeyForPath(pathname: string): NavLinkKey {
  const match = NAV_ITEMS.find((item) => item.type === 'link' && pathname.startsWith(item.to))
  return match && match.type === 'link' ? match.key : 'Dashboard'
}
