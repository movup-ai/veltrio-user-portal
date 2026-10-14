import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useFormatters } from '@/i18n'
import { cn } from '@/lib/utils'
import { ToneBadge } from '@/components/data-display/ToneBadge'
import { DAY_FORMAT } from '@/lib/date-format'
import { NOTICE_ICON, TONE_CLASS } from '@/lib/tone'
import { BILLING_STATE_TONE } from '../constants/billing.constants'
import { useBillingPortal } from '../hooks/use-billing'
import type { Billing, BillingState } from '../types/billing.types'
import { billingState, planPrice } from '../utils/billing.utils'

interface PlanSummaryProps {
  billing: Billing
  /** Only the owner reaches Stripe's portal; everyone else reads the summary. */
  canManage: boolean
}

/**
 * The plan the company is on, answered in the order an owner asks: what is it, what does it
 * cost and when, and how much of it is used.
 */
export function PlanSummary({ billing, canManage }: PlanSummaryProps) {
  const { t } = useTranslation('settings')
  const format = useFormatters()
  const portal = useBillingPortal()
  const state = billingState(billing)
  const tone = BILLING_STATE_TONE[state]
  const NoticeIcon = NOTICE_ICON[tone]
  const notice = noticeFor(state)
  const offer = billing.plans.find((plan) => plan.plan === billing.plan)
  const price = offer && billing.interval ? planPrice(offer, billing.interval) : undefined
  // A renewal date only means something while the plan will renew.
  const renews = (state === 'active' || state === 'pastDue') && billing.periodEnd

  return (
    <div
      role="group"
      aria-label={t('billing.title')}
      className={cn(
        'overflow-hidden rounded-[11px] border',
        state === 'active' ? 'border-primary' : 'border-border',
      )}
    >
      <div className="flex flex-wrap items-start gap-x-6 gap-y-4 p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[18px] leading-tight font-semibold tracking-tight">
              {billing.plan ? t(`billing.planName.${billing.plan}`) : t('billing.noPlan')}
            </span>
            {/* With no plan the name already says so; a badge would say it twice. */}
            {state !== 'none' && <ToneBadge tone={tone}>{t(`billing.state.${state}`)}</ToneBadge>}
          </div>
          {price !== undefined && billing.interval && (
            <p className="text-fg-2 m-0 text-[13.5px]">
              {format.currency(price, billing.currency)} {t(`billing.price.unit.${billing.interval}`)}
            </p>
          )}
          {renews && (
            <p className="text-fg-4 m-0 text-[12.5px]">
              {t('billing.renewsOn', {
                // With its year: a yearly plan renews too far off for a day and month to say when.
                date: format.date(renews, DAY_FORMAT),
              })}
            </p>
          )}
        </div>

        {canManage && billing.plan && (
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            <Button
              variant="outline"
              onClick={() => portal.mutate()}
              // Still busy once answered: the page is on its way to Stripe.
              loading={portal.isPending || portal.isSuccess}
            >
              {t('billing.actions.manage')}
            </Button>
            {/* Cancelling is behind this button, on Stripe's page, so it is named here. */}
            <span className="text-fg-4 text-[12px]">{t('billing.actions.manageHelp')}</span>
          </div>
        )}
      </div>

      {billing.enabled && (
        <div className="border-border-soft grid gap-x-8 gap-y-3 border-t px-4 py-3.5 sm:grid-cols-2">
          <UsageMeter
            label={t('billing.usage.vehicles')}
            used={billing.vehicles}
            limit={billing.maxVehicles}
            unlimited={billing.plan !== undefined}
          />
          <UsageMeter
            label={t('billing.usage.branches')}
            used={billing.branches}
            limit={billing.maxBranches}
            unlimited={billing.plan !== undefined}
          />
        </div>
      )}

      {notice && (
        <div
          className={cn('flex items-start gap-2.5 px-4 py-3 text-[12.5px]', TONE_CLASS[tone])}
          role="status"
        >
          <NoticeIcon className="mt-px size-4 shrink-0" aria-hidden />
          <p className="text-fg-2 m-0">{notice}</p>
        </div>
      )}
    </div>
  )

  function noticeFor(s: BillingState): string | null {
    const date = billing.periodEnd ? format.shortDate(billing.periodEnd) : ''
    switch (s) {
      case 'off':
      case 'pastDue':
      case 'onHold':
      case 'ended':
        return t(`billing.notice.${s}`)
      case 'none':
        return billing.trialAvailable
          ? t('billing.notice.noneTrial', { days: billing.trialDays })
          : t('billing.notice.none')
      case 'trialing':
      case 'ending':
        return t(`billing.notice.${s}`, { date })
      default:
        return null
    }
  }
}

interface UsageMeterProps {
  label: string
  used: number
  /** Absent where the plan sets no limit, or the company has no plan to set one. */
  limit?: number
  /** Whether a missing limit is the plan's own promise; without a plan it is only a count. */
  unlimited: boolean
}

/** How much of one of the plan's limits is used. With no limit there is nothing to fill. */
function UsageMeter({ label, used, limit, unlimited }: UsageMeterProps) {
  const { t } = useTranslation('settings')
  const full = limit !== undefined && used >= limit

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
        <span className="text-fg-3">{label}</span>
        <span className="text-foreground font-medium tabular-nums">
          {limit !== undefined
            ? t('billing.usage.of', { used, limit })
            : unlimited
              ? t('billing.usage.unlimited', { used })
              : used}
        </span>
      </div>
      {limit !== undefined && (
        <div
          role="meter"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={used}
          className="bg-surface-3 h-1.5 overflow-hidden rounded-full"
        >
          {/* At the limit the next one is refused, so the bar turns from fine to warning. */}
          <div
            className={cn('h-full rounded-full', full ? 'bg-warning' : 'bg-primary')}
            style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
