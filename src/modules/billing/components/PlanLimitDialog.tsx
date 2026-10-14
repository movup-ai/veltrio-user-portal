import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { usePermissions } from '@/components/feedback/Can'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { usePlanLimitStore } from '@/state/plan-limit.store'
import { hasAnyPermission } from '@/utils/permissions'
import { useBilling } from '../hooks/use-billing'
import type { Billing, PlanLimit } from '../types/billing.types'
import { BILLING_SETTINGS_PATH, billingState } from '../utils/billing.utils'

/**
 * Says an add was stopped by the plan, and leads to the plans. Mounted once in the layout and
 * opened through `usePlanLimitStore`, from a check before the add or the API refusing it.
 */
export function PlanLimitDialog() {
  const { t } = useTranslation('settings')
  const navigate = useNavigate()
  const { limit, close } = usePlanLimitStore()
  const { data: billing, refetch } = useBilling()
  const isOwner = hasAnyPermission(usePermissions(), ['settings.manage'])

  // The API refused on its own count, so the one on hand may be old; the dialog quotes it.
  useEffect(() => {
    if (limit) void refetch()
  }, [limit, refetch])

  // The API says only that no plan is running; one Stripe holds for a payment is fixed by the card.
  const reason = limit === 'noPlan' && billing && billingState(billing) === 'onHold' ? 'onHold' : limit
  const description = reason && billing ? describe(reason, billing) : undefined

  return (
    <ConfirmDialog
      open={limit !== undefined}
      onOpenChange={(open) => !open && close()}
      title={reason ? t(`billing.limit.title.${reason}`) : ''}
      description={
        description && !isOwner ? `${description}\n\n${t('billing.limit.ownerOnly')}` : description
      }
      confirmLabel={reason === 'onHold' ? t('billing.limit.openBilling') : t('billing.limit.viewPlans')}
      cancelLabel={t('billing.limit.notNow')}
      confirmVariant="primary"
      onConfirm={() => {
        close()
        navigate(BILLING_SETTINGS_PATH)
      }}
    />
  )

  function describe(
    reason: PlanLimit | 'onHold',
    { plan, maxVehicles, maxBranches }: Billing,
  ): string | undefined {
    if (reason === 'noPlan' || reason === 'onHold') return t(`billing.limit.description.${reason}`)
    const count = reason === 'vehicles' ? maxVehicles : maxBranches
    // Without the number the sentence would be wrong rather than vague, so it waits for it.
    if (!plan || count === undefined) return undefined
    return t(`billing.limit.description.${reason}`, { plan: t(`billing.planName.${plan}`), count })
  }
}
