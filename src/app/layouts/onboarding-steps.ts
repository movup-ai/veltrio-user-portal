/** A new company's way in, in order. Signing in is not a step: a returning account resumes. */
export const ONBOARDING_STEPS = ['account', 'company', 'plan', 'ready'] as const

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

/** The route `handle` that places a page in the sequence; AuthLayout reads it for the stepper and slider. */
export interface AuthRouteHandle {
  step: OnboardingStep
}

export const ONBOARDING_PATHS = {
  /** Not a step: decides where an account without a company goes, before any stepper shows. */
  start: '/onboarding/start',
  company: '/onboarding',
  plan: '/onboarding/plan',
  ready: '/onboarding/ready',
} as const
