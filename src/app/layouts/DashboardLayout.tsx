import { useClerk } from '@clerk/clerk-react'
import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Header } from '@/components/navigation/Header'
import { Sidebar } from '@/components/navigation/Sidebar'
import { PlanLimitDialog } from '@/modules/billing/components/PlanLimitDialog'
import { SubscriptionBanner } from '@/modules/billing/components/SubscriptionBanner'
import { AnnouncementBanner } from '@/modules/notifications/components/AnnouncementBanner'
import { useBookingStats } from '@/modules/bookings/hooks/use-bookings'
import { setupProgress, showSetupReopen, useSetup, useUpdateSetup } from '@/modules/setup'
import { useLocaleSync } from '@/services/auth/use-locale-sync'
import { useMe } from '@/services/auth/use-me'
import { useOrganizationStore } from '@/state/organization.store'

export function DashboardLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  // The bookings page's own query: answering a reservation there refreshes this count too.
  const pending = useBookingStats().data?.pending ?? 0
  const user = useMe().data?.user
  const membership = useOrganizationStore((state) => state.membership)
  const clerk = useClerk()
  const navigate = useNavigate()
  const setup = useSetup().data
  const reopenSetup = useUpdateSetup()
  useLocaleSync()

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        badges={{ Bookings: pending > 0 ? String(pending) : undefined }}
        setup={
          setup && showSetupReopen(setup, membership?.role)
            ? {
                ...setupProgress(setup.steps),
                onOpen: () => {
                  setMobileNavOpen(false)
                  reopenSetup.mutate({ dismissed: false }, { onSuccess: () => navigate('/dashboard') })
                },
              }
            : undefined
        }
        account={
          user && membership
            ? {
                name: user.fullName,
                role: membership.role,
                organization: membership.organizationName,
                onOpenProfile: () => clerk.openUserProfile(),
                onSignOut: () => void clerk.signOut(),
              }
            : undefined
        }
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMobileMenuClick={() => setMobileNavOpen(true)} />
        <SubscriptionBanner />
        <AnnouncementBanner />
        <PlanLimitDialog />
        <main className="vx-scroll min-w-0 flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
