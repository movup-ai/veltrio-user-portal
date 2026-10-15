import { useAuth } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ONBOARDING_PATHS } from '@/app/layouts/onboarding-steps'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { INVITE_PATH } from '@/modules/users/api/users.api'
import { useMyInvitations } from '@/modules/users/hooks/use-invitations'
import { hasOpenInvitation } from '@/modules/users/utils/invite.utils'
import { toOrganizationMembership } from '@/services/auth/auth.api'
import { useMe } from '@/services/auth/use-me'
import { useOrganizationStore } from '@/state/organization.store'
import { ApiError } from '@/types/api'

/**
 * Centralizes the authenticated-route gate so individual pages never have to
 * check auth state themselves. Being signed in with Clerk is not enough: the
 * session must also resolve to a platform user with a company, since every
 * request below this point is scoped to it.
 */
export function ProtectedRoute() {
  const { isLoaded, isSignedIn } = useAuth()
  const location = useLocation()
  const me = useMe()

  const setMembership = useOrganizationStore((state) => state.setMembership)
  const membership = useOrganizationStore((state) => state.membership)

  useEffect(() => {
    if (me.data) setMembership(me.data.membership && toOrganizationMembership(me.data.membership))
  }, [me.data, setMembership])

  if (!isLoaded) return <LoadingState />
  if (!isSignedIn) {
    // Clerk returns to `redirect_url` after sign-in, Google's round trip included; router state
    // was dropped, so every deep link landed on the dashboard.
    const back = window.location.origin + location.pathname + location.search + location.hash
    return <Navigate to={`/login?redirect_url=${encodeURIComponent(back)}`} replace />
  }
  if (me.isPending) return <LoadingState />

  if (me.error) {
    // Signed up with Clerk but never created a company: finish onboarding.
    if (me.error instanceof ApiError && me.error.code === 'user_not_onboarded') {
      return <Navigate to={ONBOARDING_PATHS.start} replace />
    }
    return <ErrorState description={me.error.message} onRetry={() => void me.refetch()} />
  }

  if (!me.data.membership) return <NoCompany />

  // Hold the render until the effect above has copied this company into the store. Pages read
  // the subdomain and their permissions from there, not from `me`, so a frame rendered before
  // it lands shows whatever was left over — on a second sign-in, the previous account's. The
  // check is identity, not presence: a stale value is exactly the case worth catching.
  if (membership?.organizationId !== me.data.membership.tenantId) return <LoadingState />

  return <Outlet />
}

/** An account with no company: removed from one, or never in one. An invitation is its way back. */
function NoCompany() {
  const { t } = useTranslation('auth')
  const { userId } = useAuth()
  const navigate = useNavigate()
  const invitations = useMyInvitations(userId, true)

  if (invitations.isPending) return <LoadingState />
  // A failed check is not an empty one: offering a company of one's own would hide an invitation.
  if (invitations.isError) {
    return <ErrorState description={invitations.error.message} onRetry={() => void invitations.refetch()} />
  }
  if (hasOpenInvitation(invitations.data)) return <Navigate to={INVITE_PATH} replace />
  return (
    <ErrorState
      title={t('noTenant.title')}
      description={t('noTenant.description')}
      actionLabel={t('noTenant.createCompany')}
      onRetry={() => navigate(ONBOARDING_PATHS.company)}
    />
  )
}
