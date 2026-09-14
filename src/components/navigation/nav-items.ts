import {
  CalendarCheck,
  Car,
  CreditCard,
  LayoutDashboard,
  MapPin,
  Settings,
  Tag,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type NavEntry =
  | { type: 'group'; label: string }
  | { type: 'link'; label: string; to: string; icon: LucideIcon; badge?: string; urgent?: boolean }

export const NAV_ITEMS: NavEntry[] = [
  { type: 'group', label: 'Operations' },
  { type: 'link', label: 'Dashboard', to: '/app/dashboard', icon: LayoutDashboard },
  { type: 'link', label: 'Bookings', to: '/app/bookings', icon: CalendarCheck, badge: '12' },
  { type: 'link', label: 'Vehicles', to: '/app/vehicles', icon: Car },
  { type: 'link', label: 'Customers', to: '/app/customers', icon: Users },
  { type: 'group', label: 'Revenue' },
  { type: 'link', label: 'Payments', to: '/app/payments', icon: CreditCard, badge: '2', urgent: true },
  { type: 'link', label: 'Pricing', to: '/app/pricing', icon: Tag },
  { type: 'group', label: 'Setup' },
  { type: 'link', label: 'Locations', to: '/app/locations', icon: MapPin },
  { type: 'link', label: 'Settings', to: '/app/settings', icon: Settings },
]

export function navLabelForPath(pathname: string): string {
  const match = NAV_ITEMS.find((item) => item.type === 'link' && pathname.startsWith(item.to))
  return match && match.type === 'link' ? match.label : 'Dashboard'
}
