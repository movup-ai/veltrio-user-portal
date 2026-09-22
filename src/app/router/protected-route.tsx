import { useAuth } from '@clerk/clerk-react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
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
 * session must also resolve to a platform user with a company, since every
 * request below this point is scoped to it.
 */
export function ProtectedRoute() {
  const { t } = useTranslation('auth')
  const { isLoaded, isSignedIn, userId } = useAuth()
  const location = useLocation()
  const me = useMe()

  const queryClient = useQueryClient()
  const previousUserId = useRef<string | null>(null)

  const setMembership = useOrganizationStore((state) => state.setMembership)

  useEffect(() => {
    if (me.data) setMembership(me.data.membership && toOrganizationMembership(me.data.membership))
  }, [me.data, setMembership])

  // Everything cached here belongs to whoever was signed in when it was fetched. Signing out
  // and back in inside the same tab never reloads the page, and `me` is cached with
  // `staleTime: Infinity`, so without this the next person would be shown the last one's
  // company and fleet until something forced a refetch.
  useEffect(() => {
    const current = userId ?? null
    if (previousUserId.current === current) return
    if (previousUserId.current !== null) {
      void queryClient.cancelQueries()
      queryClient.clear()
    }
    previousUserId.current = current
  }, [userId, queryClient])

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

  if (!me.data.membership) {
    return <ErrorState title={t('noTenant.title')} description={t('noTenant.description')} />
  }

  return <Outlet />
}
