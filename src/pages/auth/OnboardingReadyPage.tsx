import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ONBOARDING_PATHS } from '@/app/layouts/onboarding-steps'
import { Button } from '@/components/ui/button'
import { useFormatters } from '@/i18n'
import { useBilling } from '@/modules/billing/hooks/use-billing'
import { useSubscriptionReturn } from '@/modules/billing/hooks/use-subscription-return'
import type { Billing } from '@/modules/billing/types/billing.types'
import { billingState } from '@/modules/billing/utils/billing.utils'
import { SetupStepList, useSetup } from '@/modules/setup'
import { useOrganizationStore } from '@/state/organization.store'
import { StepHeading } from './StepHeading'

function PlanStatus({ billing }: { billing: Billing }) {
  const { t } = useTranslation(['auth', 'settings'])
  const format = useFormatters()
  const state = billingState(billing)
  const plan = billing.plan && t(`settings:billing.planName.${billing.plan}`)

  if (state === 'trialing' && billing.periodEnd) {
    const date = format.shortDate(billing.periodEnd)
    return (
      <p className="text-body-sm text-fg-2 m-0 text-center">
        {t('auth:readyStep.plan.trialing', { plan, date })}
      </p>
    )
  }
  if (state === 'active') {
    return (
      <p className="text-body-sm text-fg-2 m-0 text-center">{t('auth:readyStep.plan.active', { plan })}</p>
    )
  }
  if (state === 'none' || state === 'ended') {
    return (
      <div className="text-body-sm bg-surface-2 border-border flex flex-col items-center gap-1 rounded-md border px-4 py-3 text-center">
        <p className="text-fg-2 m-0">{t('auth:readyStep.plan.none')}</p>
        <Link to={ONBOARDING_PATHS.plan} className="text-primary font-semibold hover:underline">
          {t('auth:readyStep.plan.choose')}
        </Link>
      </div>
    )
  }
  return null
}

/** Last step: the company exists, so this only points at what to set up first. */
export function OnboardingReadyPage() {
  const { t } = useTranslation('auth')
  const refresh = useSubscriptionReturn()
  const { data: billing } = useBilling()
  const company = useOrganizationStore((state) => state.membership?.organizationName)
  // The plan has its own line above, which also says when a trial ends.
  const steps = useSetup().data?.steps.filter((step) => step.key !== 'plan')

  return (
    <div className="flex w-full max-w-lg flex-col gap-7">
      <div className="flex flex-col items-center gap-3">
        <span className="bg-success-tint text-success flex size-12 items-center justify-center rounded-full">
          <Check className="size-6" strokeWidth={2.5} aria-hidden />
        </span>
        <StepHeading title={t('readyStep.title')}>{t('readyStep.subtitle', { company })}</StepHeading>
      </div>

      {/* Held back while Stripe is asked: the plan just bought is not known until then. */}
      {billing && !refresh.isPending && <PlanStatus billing={billing} />}

      {steps && <SetupStepList steps={steps} />}

      <Button asChild size="lg" className="w-full">
        <Link to="/dashboard">{t('readyStep.dashboard')}</Link>
      </Button>
    </div>
  )
}
