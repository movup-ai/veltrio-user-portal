import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '@/components/navigation/Header'
import { Sidebar } from '@/components/navigation/Sidebar'
import { useBookingStats } from '@/modules/bookings/hooks/use-bookings'
import { useMe } from '@/services/auth/use-me'
import { useOrganizationStore } from '@/state/organization.store'

export function DashboardLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  // The bookings page's own query: answering a reservation there refreshes this count too.
  const pending = useBookingStats().data?.pending ?? 0
  const user = useMe().data?.user
  const membership = useOrganizationStore((state) => state.membership)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        badges={{ Bookings: pending > 0 ? String(pending) : undefined }}
        account={
          user && membership
            ? { name: user.fullName, role: membership.role, organization: membership.organizationName }
            : undefined
        }
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMobileMenuClick={() => setMobileNavOpen(true)} />
        <main className="vx-scroll min-w-0 flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
