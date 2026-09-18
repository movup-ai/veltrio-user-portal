import { SignUp } from '@clerk/clerk-react'

/**
 * Identity only. Company details are collected afterwards on /onboarding,
 * because the backend refuses to create a tenant until Clerk has verified the
 * email — so they cannot be submitted in the same step.
 */
export function SignUpPage() {
  return <SignUp routing="path" path="/sign-up" />
}
