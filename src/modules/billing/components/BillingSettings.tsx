import { useTranslation } from 'react-i18next'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { usePermissions } from '@/components/feedback/Can'
import { SettingsSection } from '@/modules/settings/components/SettingsCard'
import { hasAnyPermission } from '@/utils/permissions'
import { useBilling } from '../hooks/use-billing'
import { useSubscriptionReturn } from '../hooks/use-subscription-return'
import { BillingHistory } from './BillingHistory'
import { CreditsCard } from './CreditsCard'
import { PlanPicker } from './PlanPicker'
import { PlanSummary } from './PlanSummary'

/**
 * The company's Veltrio plan: what it is on, what it uses of it, and the plans it can move to.
 * Stripe sends the owner back from checkout and from its portal with a marker on the URL, and
 * the subscription is then read from Stripe, since the event reporting it can arrive after them.
 */
export function BillingSettings() {
  const { t } = useTranslation('settings')
  const { data: billing, isLoading, refetch } = useBilling()
  const refresh = useSubscriptionReturn()
  const canManage = hasAnyPermission(usePermissions(), ['settings.manage'])

  // Nothing is offered while Stripe is being asked: the plan just bought is not known yet, and
  // the picker would open on the wrong period and offer that plan as a switch.
  const settling = isLoading || refresh.isPending

  return (
    <>
      <SettingsSection title={t('billing.title')} description={t('billing.description')}>
        {settling ? (
          <LoadingState />
        ) : !billing ? (
          // Only with nothing to show: a refetch that failed leaves the last answer on screen.
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <>
            <PlanSummary billing={billing} canManage={canManage} />
            {billing.enabled && <PlanPicker billing={billing} canManage={canManage} />}
            {billing.enabled && !canManage && (
              <p className="text-fg-4 m-0 text-[12.5px]">{t('billing.ownerOnly')}</p>
            )}
          </>
        )}
      </SettingsSection>
      {/* Credits pay for checks on a plan, so they are not offered where nothing is billed. */}
      {billing?.enabled && <CreditsCard billing={billing} canManage={canManage} />}
      {/* Invoices are the owner's, as the card is; the API refuses them to anyone else. */}
      {billing?.enabled && canManage && <BillingHistory />}
    </>
  )
}
