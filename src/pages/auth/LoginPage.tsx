import { SignIn } from '@clerk/clerk-react'
import { authPageAppearance } from '@/app/providers/clerk-appearance'
import { AuthForm } from './AuthForm'

/**
 * Clerk owns the credential flow end to end (password, reset, verification,
 * MFA), so there is nothing to hand-roll here — see ClerkRouterProvider for the
 * localization and routing wiring.
 */
export function LoginPage() {
  return (
    // The legal line shows here too: Google sign-in creates the account when there is none yet.
    <AuthForm fields={1}>
      <SignIn routing="path" path="/login" appearance={authPageAppearance} />
    </AuthForm>
  )
}
