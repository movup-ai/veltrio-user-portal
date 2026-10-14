import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { useFormatters } from '@/i18n'
import { cn } from '@/lib/utils'
import {
  BILLING_INTERVALS,
  ENTERPRISE_FEATURES,
  PLAN_FEATURES,
  SALES_EMAIL,
} from '../constants/billing.constants'
import { useChangePlan, useStartCheckout } from '../hooks/use-billing'
import type { Billing, BillingInterval, PlanChoice, PlanOffer } from '../types/billing.types'
import {
  billingState,
  type CheckoutReturn,
  isQuoted,
  isSubscribed,
  planMove,
  planPrice,
  planShortfall,
  type PlanMove,
} from '../utils/billing.utils'

type Shortfall = ReturnType<typeof planShortfall>

interface PlanPickerProps {
  billing: Billing
  /** Only the owner chooses; everyone else reads the plans. */
  canManage: boolean
  /** Where checkout comes back to; the Billing tab unless given. */
  returnTo?: CheckoutReturn
  /** Replaces the card grid's columns, for a narrower column than the settings page. */
  listClassName?: string
  /** Puts the month/year switch at the right, clear of a heading centred above the cards. */
  toggleAtEnd?: boolean
}

/** The plans on offer, by month or by year, with the way to start, upgrade or downgrade. */
export function PlanPicker({ billing, canManage, returnTo, listClassName, toggleAtEnd }: PlanPickerProps) {
  const { t } = useTranslation('settings')
  const format = useFormatters()
  const [period, setPeriod] = useState<BillingInterval>(billing.interval ?? 'month')
  const [switching, setSwitching] = useState<PlanChoice | null>(null)
  const checkout = useStartCheckout(returnTo)
  const change = useChangePlan()
  const subscribed = isSubscribed(billing)
  // On hold, Stripe still has the subscription: the way out is the card, not another plan.
  const choosable = canManage && billingState(billing) !== 'onHold'
  // Still leaving once answered: a second plan clicked then would open a second checkout.
  const leaving = checkout.isPending || checkout.isSuccess
  const switchingTo = billing.plans.find((offer) => offer.plan === switching?.plan)
  // Where the plans on sale stop, which is where a quoted one starts.
  const largestFleet = Math.max(
    ...billing.plans.map((offer) => (isQuoted(offer) ? 0 : (offer.maxVehicles ?? 0))),
  )
  const switchPrice = switching && switchingTo ? planPrice(switchingTo, switching.interval) : undefined
  const switchMove = switching && switchingTo ? planMove(billing, switchingTo, switching.interval) : undefined

  return (
    <div className="flex flex-col gap-3">
      <Tabs
        value={period}
        onValueChange={(value) => setPeriod(value as BillingInterval)}
        className={cn(toggleAtEnd && 'flex justify-end')}
      >
        <TabsList aria-label={t('billing.interval.label')}>
          {BILLING_INTERVALS.map((option) => (
            <TabsTrigger key={option} value={option} className="gap-1.5">
              {t(`billing.interval.${option}`)}
              {option === 'year' && (
                <span className="bg-success-tint text-success rounded-full px-1.5 py-px text-[11px] font-semibold">
                  {t('billing.interval.save', { percent: billing.yearlyDiscountPercent })}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <ul className={cn('m-0 grid list-none gap-3 p-0', listClassName ?? 'sm:grid-cols-2 xl:grid-cols-4')}>
        {billing.plans.map((offer) => {
          // What choosing this card would be; a company with no plan is simply starting one.
          const move = subscribed ? planMove(billing, offer, period) : undefined
          // Only for someone who could choose it: to anyone else it is not a refusal.
          const shortfall = choosable ? planShortfall(offer, billing) : undefined
          return (
            <PlanCard
              key={offer.plan}
              offer={offer}
              billing={billing}
              interval={period}
              current={subscribed && billing.plan === offer.plan}
              largestFleet={largestFleet}
              shortfall={shortfall}
              action={
                choosable && (
                  <PlanAction
                    offer={offer}
                    billing={billing}
                    period={period}
                    move={move}
                    shortfall={shortfall}
                    loading={leaving && checkout.variables?.plan === offer.plan}
                    disabled={leaving}
                    onChoose={() => {
                      const choice = { plan: offer.plan, interval: period }
                      if (subscribed) setSwitching(choice)
                      else checkout.mutate(choice)
                    }}
                  />
                )
              }
            />
          )
        })}
      </ul>

      <ConfirmDialog
        open={switching !== null}
        onOpenChange={(open) => !open && setSwitching(null)}
        title={switching && switchMove ? moveTitle(switchMove, switching) : ''}
        // The plan, its price and its period are named here: the card behind may show another.
        description={
          switching && switchPrice !== undefined
            ? t('billing.confirmChange.description', {
                plan: t(`billing.planName.${switching.plan}`),
                price: format.currency(switchPrice, billing.currency),
                period: t(`billing.confirmChange.period.${switching.interval}`),
              })
            : undefined
        }
        // The button that asked is the button that confirms, word for word.
        confirmLabel={switching && switchMove ? moveLabel(switchMove, switching.interval) : undefined}
        confirmVariant="primary"
        loading={change.isPending}
        onConfirm={() => switching && change.mutate(switching, { onSettled: () => setSwitching(null) })}
      />
    </div>
  )

  function moveLabel(move: PlanMove, interval: BillingInterval): string {
    if (move === 'upgrade') return t('billing.actions.upgrade')
    if (move === 'downgrade') return t('billing.actions.downgrade')
    return t(`billing.actions.switchTo.${interval}`)
  }

  function moveTitle(move: PlanMove, choice: PlanChoice): string {
    const plan = t(`billing.planName.${choice.plan}`)
    if (move === 'upgrade') return t('billing.confirmChange.title.upgrade', { plan })
    if (move === 'downgrade') return t('billing.confirmChange.title.downgrade', { plan })
    return t(`billing.confirmChange.title.period.${choice.interval}`)
  }
}

/** The limit a plan's refusal is about, so the disabled button can be described by it. */
function limitId(offer: PlanOffer, limit: NonNullable<Shortfall>): string {
  return `billing-plan-${offer.plan}-${limit}`
}

interface PlanCardProps {
  offer: PlanOffer
  billing: Billing
  interval: BillingInterval
  current: boolean
  /** The vehicle limit of the largest plan on sale; a quoted plan is for fleets past it. */
  largestFleet: number
  shortfall: Shortfall
  action: React.ReactNode
}

function PlanCard({ offer, billing, interval, current, largestFleet, shortfall, action }: PlanCardProps) {
  const { t } = useTranslation('settings')
  const format = useFormatters()
  const price = planPrice(offer, interval)
  const quoted = isQuoted(offer)

  return (
    <li
      className={cn(
        'flex flex-col gap-3 rounded-[11px] border p-4',
        current ? 'border-primary bg-primary/[0.03]' : 'border-border',
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex min-h-[22px] items-center justify-between gap-2">
          <h3 className="m-0 text-[14px] font-semibold">{t(`billing.planName.${offer.plan}`)}</h3>
          {current && <Badge variant="primary">{t('billing.currentTag')}</Badge>}
        </div>
        {/* The price of the period shown, as it is charged: a year is not broken into months. */}
        <p className="m-0 flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-[22px] leading-tight font-semibold tracking-tight">
            {price === undefined ? t('billing.price.quoted') : format.currency(price, billing.currency)}
          </span>
          {/* A real space, so the price is read and copied as "$99 / month", not "$99/ month". */}{' '}
          {price !== undefined && (
            <span className="text-fg-4 text-[13px]">{t(`billing.price.unit.${interval}`)}</span>
          )}
        </p>
      </div>

      {/* The limits are what tells the plans apart, so they read stronger than what follows. */}
      <ul className="text-foreground m-0 flex list-none flex-col gap-1.5 p-0 text-[13px] font-medium">
        <Included
          id={limitId(offer, 'vehicles')}
          exceededBy={shortfall === 'vehicles' ? billing.vehicles : undefined}
        >
          {quoted
            ? t('billing.limits.vehiclesOver', { count: largestFleet })
            : offer.maxVehicles === undefined
              ? t('billing.limits.vehiclesUnlimited')
              : t('billing.limits.vehicles', { count: offer.maxVehicles })}
        </Included>
        <Included
          id={limitId(offer, 'branches')}
          exceededBy={shortfall === 'branches' ? billing.branches : undefined}
        >
          {offer.maxBranches === undefined
            ? t('billing.limits.branchesUnlimited')
            : t('billing.limits.branches', { count: offer.maxBranches })}
        </Included>
      </ul>

      <ul className="border-border-soft text-fg-3 m-0 flex list-none flex-col gap-1.5 border-t p-0 pt-3 text-[13px]">
        {quoted
          ? ENTERPRISE_FEATURES.map((feature) => (
              <Included key={feature}>{t(`billing.enterpriseFeatures.${feature}`)}</Included>
            ))
          : PLAN_FEATURES.map((feature) => (
              <Included key={feature}>{t(`billing.features.${feature}`)}</Included>
            ))}
      </ul>

      {action && <div className="mt-auto pt-1">{action}</div>}
    </li>
  )
}

interface IncludedProps {
  id?: string
  /** Set on a limit the company is already past: how many it has. */
  exceededBy?: number
  children: React.ReactNode
}

/**
 * One line of what a plan gives. A limit the company is already past is marked where it is
 * stated, which says why the plan cannot be chosen; the summary above shows by how much.
 */
function Included({ id, exceededBy, children }: IncludedProps) {
  const { t } = useTranslation('settings')
  const exceeded = exceededBy !== undefined
  const Icon = exceeded ? X : Check

  return (
    <li id={id} className="flex items-start gap-2">
      <Icon
        className={cn('mt-[3px] size-3.5 shrink-0', exceeded ? 'text-error' : 'text-success')}
        aria-hidden
      />
      {/* Marked by colour, with the count on hover and for screen readers: written out, it
          wrapped in one card only and left the others with a gap above their buttons. */}
      <span
        className={cn(exceeded && 'text-error')}
        title={exceeded ? t('billing.tooSmall.have', { count: exceededBy }) : undefined}
      >
        {children}
        {exceeded && <span className="sr-only"> · {t('billing.tooSmall.have', { count: exceededBy })}</span>}
      </span>
    </li>
  )
}

interface PlanActionProps {
  offer: PlanOffer
  billing: Billing
  period: BillingInterval
  /** Absent for a company with no plan, which starts one rather than moving. */
  move: PlanMove | undefined
  shortfall: Shortfall
  loading: boolean
  disabled: boolean
  onChoose: () => void
}

function PlanAction({
  offer,
  billing,
  period,
  move,
  shortfall,
  loading,
  disabled,
  onChoose,
}: PlanActionProps) {
  const { t } = useTranslation('settings')

  // A quoted plan is set up by Veltrio, so there is nothing to buy or move to here.
  if (isQuoted(offer)) {
    if (move === 'current' || move === 'period') return <CurrentPlan />
    return SALES_EMAIL ? (
      <Button variant="outline" className="w-full" asChild>
        <a href={`mailto:${SALES_EMAIL}`}>{t('billing.actions.contact')}</a>
      </Button>
    ) : null
  }
  if (move === 'current') return <CurrentPlan />

  const label =
    move === 'upgrade'
      ? t('billing.actions.upgrade')
      : move === 'downgrade'
        ? t('billing.actions.downgrade')
        : move === 'period'
          ? t(`billing.actions.switchTo.${period}`)
          : billing.trialAvailable
            ? t('billing.actions.startTrial')
            : t('billing.actions.choose')
  const button = (
    <Button
      // Growing, or starting, is the step the page wants taken; the rest stay quiet.
      variant={move === undefined || move === 'upgrade' ? 'primary' : 'outline'}
      className="w-full"
      disabled={disabled || shortfall !== undefined}
      // A plan too small for the fleet says why on the limit it breaks.
      aria-describedby={shortfall && limitId(offer, shortfall)}
      loading={loading}
      onClick={onChoose}
    >
      {label}
    </Button>
  )
  if (!shortfall) return button

  // The span is what makes the tooltip work: a disabled button fires no hover of its own.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="block rounded-md">
          {button}
        </span>
      </TooltipTrigger>
      {/* Below the button: above it, the tooltip covered the last thing the plan includes. */}
      <TooltipContent side="bottom" className="max-w-[280px] text-balance">
        {t(`billing.tooSmall.${shortfall}`, {
          have: billing[shortfall],
          plan: t(`billing.planName.${offer.plan}`),
          limit: shortfall === 'vehicles' ? offer.maxVehicles : offer.maxBranches,
        })}
      </TooltipContent>
    </Tooltip>
  )
}

function CurrentPlan() {
  const { t } = useTranslation('settings')
  return (
    <Button variant="outline" className="w-full" disabled>
      {t('billing.actions.current')}
    </Button>
  )
}
