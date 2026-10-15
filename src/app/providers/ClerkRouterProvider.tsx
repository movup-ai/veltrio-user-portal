import { ClerkProvider, useAuth, useClerk } from '@clerk/clerk-react'
import { esES } from '@clerk/localizations'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useNavigate } from 'react-router-dom'
import { ONBOARDING_PATHS } from '@/app/layouts/onboarding-steps'
import { clerkToken } from '@/services/auth/clerk-token'
import { useOrganizationStore } from '@/state/organization.store'
import { clerkAppearance } from './clerk-appearance'
import { CLERK_JS_VERSION } from './clerk-js'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!publishableKey) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY is not set. See .env.example.')
}

/**
 * Hands the Clerk instance to the axios interceptor during render rather than
 * from an effect: React runs child effects before a parent's, so an effect here
 * would let a protected route's first request go out with no bearer token.
 */
function ClerkTokenBridge() {
  clerkToken.setInstance(useClerk())
  return null
}

/**
 * Drops everything the previous account left behind when the signed-in user changes.
 *
 * Signing out and back in happens inside the same tab with no reload, and both the query
 * cache and the organization store outlive the routes that filled them — `me` is cached with
 * `staleTime: Infinity`, so nothing would refetch it. The next person would be shown the last
 * one's company, fleet, subdomain and permissions.
 *
 * It has to live here rather than in ProtectedRoute: signing out navigates to /login, which
 * unmounts ProtectedRoute and takes any ref it was keeping with it, so the change from one
 * user to the next would never be observed at all.
 */
function IdentityReset() {
  const { userId } = useAuth()
  const queryClient = useQueryClient()
  const previousUserId = useRef<string | null>(null)

  useEffect(() => {
    const current = userId ?? null
    if (previousUserId.current === current) return
    if (previousUserId.current !== null) {
      void queryClient.cancelQueries()
      queryClient.clear()
      useOrganizationStore.getState().setMembership(null)
    }
    previousUserId.current = current
  }, [userId, queryClient])

  return null
}

/**
 * Lives inside the router (not above it) so Clerk's hosted screens navigate
 * through React Router instead of reloading the page.
 */
export function ClerkRouterProvider() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('auth')
  const spanish = i18n.resolvedLanguage === 'es'

  // Our headings over Clerk's generic "Sign in to Veltrio"; every other string stays Clerk's.
  const localization = useMemo(() => {
    const base = spanish ? esES : {}
    return {
      ...base,
      signIn: {
        ...base.signIn,
        start: { ...base.signIn?.start, title: t('login.title'), subtitle: t('login.subtitle') },
      },
      signUp: {
        ...base.signUp,
        start: { ...base.signUp?.start, title: t('signUp.title'), subtitle: t('signUp.subtitle') },
      },
    }
  }, [spanish, t])

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      localization={localization}
      appearance={clerkAppearance}
      clerkJSVersion={CLERK_JS_VERSION}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/login"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      // Forced, not a fallback: a return address carried over from sign-in would otherwise send a
      // brand-new account to the dashboard, which only bounces it back here.
      signUpForceRedirectUrl={ONBOARDING_PATHS.start}
      afterSignOutUrl="/login"
    >
      <ClerkTokenBridge />
      <IdentityReset />
      <Outlet />
    </ClerkProvider>
  )
}
