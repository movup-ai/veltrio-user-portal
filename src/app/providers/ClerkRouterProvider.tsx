import { ClerkProvider, useClerk } from '@clerk/clerk-react'
import { esES } from '@clerk/localizations'
import { useTranslation } from 'react-i18next'
import { Outlet, useNavigate } from 'react-router-dom'
import { clerkToken } from '@/services/auth/clerk-token'

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
 * Lives inside the router (not above it) so Clerk's hosted screens navigate
 * through React Router instead of reloading the page.
 */
export function ClerkRouterProvider() {
  const navigate = useNavigate()
  const { i18n } = useTranslation()

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      localization={i18n.resolvedLanguage === 'es' ? esES : undefined}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/login"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/app/dashboard"
      signUpFallbackRedirectUrl="/onboarding"
      afterSignOutUrl="/login"
    >
      <ClerkTokenBridge />
      <Outlet />
    </ClerkProvider>
  )
}
