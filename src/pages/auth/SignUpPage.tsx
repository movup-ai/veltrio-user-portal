import { SignUp } from '@clerk/clerk-react'
import { authPageAppearance } from '@/app/providers/clerk-appearance'
import { AuthForm } from './AuthForm'

/**
 * Identity only. Company details are collected afterwards on /onboarding,
 * because the backend refuses to create a tenant until Clerk has verified the
 * email — so they cannot be submitted in the same step.
 */
export function SignUpPage() {
  return (
    <AuthForm fields={2}>
      <SignUp routing="path" path="/sign-up" appearance={authPageAppearance} />
    </AuthForm>
  )
}
