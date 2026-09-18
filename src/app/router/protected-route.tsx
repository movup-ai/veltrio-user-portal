import { useAuth } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { toOrganizationMembership } from '@/services/auth/auth.api'
import { useMe } from '@/services/auth/use-me'
import { useOrganizationStore } from '@/state/organization.store'
import { ApiError } from '@/types/api'

/**
 * Centralizes the authenticated-route gate so individual pages never have to
 * check auth state themselves. Being signed in with Clerk is not enough: the
 * session must also resolve to a platform user with at least one tenant, since
 * every request below this point is scoped by the active one.
 */
export function ProtectedRoute() {
  const { t } = useTranslation('auth')
  const { isLoaded, isSignedIn } = useAuth()
  const location = useLocation()
  const me = useMe()

  const setMemberships = useOrganizationStore((state) => state.setMemberships)
  const activeOrganizationId = useOrganizationStore((state) => state.activeOrganizationId)

  useEffect(() => {
    if (me.data) setMemberships(me.data.memberships.map(toOrganizationMembership))
  }, [me.data, setMemberships])

  if (!isLoaded) return <LoadingState />
  if (!isSignedIn) return <Navigate to="/login" state={{ from: location }} replace />
  if (me.isPending) return <LoadingState />

  if (me.error) {
    // Signed up with Clerk but never created a company: finish onboarding.
    if (me.error instanceof ApiError && me.error.code === 'user_not_onboarded') {
      return <Navigate to="/onboarding" replace />
    }
    return <ErrorState description={me.error.message} onRetry={() => void me.refetch()} />
  }

  if (me.data.memberships.length === 0) {
    return <ErrorState title={t('noTenant.title')} description={t('noTenant.description')} />
  }

  // Hold the first render until the effect above has picked an active tenant:
  // requests made before that would go out without the X-Tenant-Id header.
  if (!activeOrganizationId) return <LoadingState />

  return <Outlet />
}
