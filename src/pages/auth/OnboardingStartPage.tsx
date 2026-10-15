import { useAuth } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'
import { ONBOARDING_PATHS } from '@/app/layouts/onboarding-steps'
import { LoadingState } from '@/components/feedback/LoadingState'
import { INVITE_PATH } from '@/modules/users/api/users.api'
import { useMyInvitations } from '@/modules/users/hooks/use-invitations'
import { hasOpenInvitation } from '@/modules/users/utils/invite.utils'
import { useMe } from '@/services/auth/use-me'

/**
 * Where sign-up lands. An invited person joins instead of setting up a company, and the
 * question is settled here, on a page without the stepper, so it never flashes the company step.
 */
export function OnboardingStartPage() {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const me = useMe()
  const membership = me.data?.membership
  // `user_not_onboarded` is the error here; any other still leaves the company step to try.
  const noCompany = Boolean(me.error) || (me.data !== undefined && !membership)
  const invitations = useMyInvitations(userId, noCompany)

  if (!isLoaded) return <LoadingState />
  if (!isSignedIn) return <Navigate to="/login" replace />
  if (me.isPending) return <LoadingState />
  if (membership) return <Navigate to="/dashboard" replace />
  if (invitations.isPending) return <LoadingState />
  if (hasOpenInvitation(invitations.data)) return <Navigate to={INVITE_PATH} replace />
  return <Navigate to={ONBOARDING_PATHS.company} replace />
}
