import {
  CalendarCheck,
  CalendarDays,
  Car,
  CreditCard,
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
export type NavLinkKey = 'Dashboard' | 'Bookings' | 'Calendar' | 'Vehicles' | 'Customers' | 'Verification' | 'Payments' | 'Pricing' | 'Locations' | 'Settings'

export type NavEntry =
  | { type: 'group'; key: NavGroupKey }
  | { type: 'link'; key: NavLinkKey; to: string; icon: LucideIcon; badge?: string; urgent?: boolean }

export const NAV_ITEMS: NavEntry[] = [
  { type: 'group', key: 'Operations' },
  { type: 'link', key: 'Dashboard', to: '/app/dashboard', icon: LayoutDashboard },
  { type: 'link', key: 'Bookings', to: '/app/bookings', icon: CalendarCheck, badge: '12' },
  { type: 'link', key: 'Calendar', to: '/app/calendar', icon: CalendarDays },
  { type: 'link', key: 'Vehicles', to: '/app/vehicles', icon: Car },
  { type: 'link', key: 'Customers', to: '/app/customers', icon: Users },
  { type: 'link', key: 'Verification', to: '/app/verification', icon: ShieldCheck },
  { type: 'group', key: 'Revenue' },
  { type: 'link', key: 'Payments', to: '/app/payments', icon: CreditCard, badge: '2', urgent: true },
  { type: 'link', key: 'Pricing', to: '/app/pricing', icon: Tag },
  { type: 'group', key: 'Setup' },
  { type: 'link', key: 'Locations', to: '/app/locations', icon: MapPin },
  { type: 'link', key: 'Settings', to: '/app/settings', icon: Settings },
]

/** The nav key for a path — callers translate it via `t('nav:links.<key>')`. */
export function navKeyForPath(pathname: string): NavLinkKey {
  const match = NAV_ITEMS.find((item) => item.type === 'link' && pathname.startsWith(item.to))
  return match && match.type === 'link' ? match.key : 'Dashboard'
}
