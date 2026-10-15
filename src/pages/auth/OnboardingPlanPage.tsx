import { useTranslation } from 'react-i18next'
import { Link, Navigate } from 'react-router-dom'
import { ONBOARDING_PATHS } from '@/app/layouts/onboarding-steps'
import { usePermissions } from '@/components/feedback/Can'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Button } from '@/components/ui/button'
import { PlanPicker } from '@/modules/billing/components/PlanPicker'
import { useBilling } from '@/modules/billing/hooks/use-billing'
import { isSubscribed } from '@/modules/billing/utils/billing.utils'
import { hasAnyPermission } from '@/utils/permissions'
import { StepHeading } from './StepHeading'

// A finished checkout lands on the last step; one the owner leaves comes back to the plans.
const CHECKOUT_RETURN = { donePath: ONBOARDING_PATHS.ready, cancelPath: ONBOARDING_PATHS.plan }

/** Third step: the plans, with a free trial where one is left. Skippable, as the portal opens without one. */
export function OnboardingPlanPage() {
  const { t } = useTranslation('auth')
  const { data: billing, isLoading, error, refetch } = useBilling()
  const canManage = hasAnyPermission(usePermissions(), ['settings.manage'])

  if (isLoading) return <LoadingState />
  if (error || !billing) return <ErrorState description={error?.message} onRetry={() => void refetch()} />
  // Nothing to choose where the deployment does not bill.
  if (!billing.enabled) return <Navigate to={ONBOARDING_PATHS.ready} replace />
  // Come back to from the stepper once a plan runs: the cards then mark it, and the step moves on.
  const subscribed = isSubscribed(billing)

  return (
    <div className="flex w-full max-w-[1120px] flex-col gap-7">
      <StepHeading title={t('planStep.title')}>
        {billing.trialAvailable
          ? t('planStep.subtitleTrial', { count: billing.trialDays })
          : t('planStep.subtitle')}{' '}
        {/* Quiet on purpose: skippable, but not the choice the step is for. */}
        {!subscribed && (
          <Link
            to={ONBOARDING_PATHS.ready}
            className="text-primary font-semibold whitespace-nowrap hover:underline"
          >
            {t('planStep.later')}
          </Link>
        )}
      </StepHeading>

      {/* Columns by the space the form column has, not the window: four only where four fit. */}
      <div className="@container">
        <PlanPicker
          billing={billing}
          canManage={canManage}
          returnTo={CHECKOUT_RETURN}
          listClassName="@lg:grid-cols-2 @5xl:grid-cols-4"
          toggleAtEnd
        />
      </div>

      {subscribed && (
        <Button asChild className="w-full max-w-md self-center">
          <Link to={ONBOARDING_PATHS.ready}>{t('planStep.continue')}</Link>
        </Button>
      )}
    </div>
  )
}
