import { useAuth } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'
import { ONBOARDING_PATHS } from '@/app/layouts/onboarding-steps'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { INVITE_PATH } from '@/modules/users/api/users.api'
import { useMyInvitations } from '@/modules/users/hooks/use-invitations'
import { hasOpenInvitation } from '@/modules/users/utils/invite.utils'
import { useMe } from '@/services/auth/use-me'
import { ApiError } from '@/types/api'

/**
 * Where sign-up lands. An invited person joins instead of setting up a company, and the
 * question is settled here, on a page without the stepper, so it never flashes the company step.
 */
export function OnboardingStartPage() {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const me = useMe()
  const membership = me.data?.membership
  // Only this error means "no account yet"; any other failure is shown, not routed around.
  const notOnboarded = me.error instanceof ApiError && me.error.code === 'user_not_onboarded'
  const noCompany = notOnboarded || (me.data !== undefined && !membership)
  const invitations = useMyInvitations(userId, noCompany)

  if (!isLoaded) return <LoadingState />
  if (!isSignedIn) return <Navigate to="/login" replace />
  if (me.isPending) return <LoadingState />
  if (!me.data && !notOnboarded) {
    return <ErrorState description={me.error?.message} onRetry={() => void me.refetch()} />
  }
  if (membership) return <Navigate to="/dashboard" replace />
  if (invitations.isPending) return <LoadingState />
  // A failed check is not an empty one: guessing "none" would send an invitee to set up a company.
  if (invitations.isError) {
    return <ErrorState description={invitations.error.message} onRetry={() => void invitations.refetch()} />
  }
  if (hasOpenInvitation(invitations.data)) return <Navigate to={INVITE_PATH} replace />
  return <Navigate to={ONBOARDING_PATHS.company} replace />
}
