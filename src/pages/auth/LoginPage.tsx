import { SignIn } from '@clerk/clerk-react'

/**
 * Clerk owns the credential flow end to end (password, reset, verification,
 * MFA), so there is nothing to hand-roll here — see ClerkRouterProvider for the
 * localization and routing wiring.
 */
export function LoginPage() {
  return <SignIn routing="path" path="/login" />
}
