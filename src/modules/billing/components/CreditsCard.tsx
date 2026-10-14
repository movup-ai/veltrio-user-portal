import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Coins } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PROVIDER_KINDS } from '@/modules/bookings/types/booking.types'
import { useConfirmPack } from '../hooks/use-billing'
import type { Billing } from '../types/billing.types'
import { PACK_CHECKOUT_PARAM, billingState, creditLevel } from '../utils/billing.utils'
import { AutoRechargeDialog } from './AutoRechargeDialog'
import { BillingSection } from './BillingSection'
import { BuyCreditsDialog } from './BuyCreditsDialog'

interface CreditsCardProps {
  billing: Billing
  /** Only the owner buys credits. */
  canManage: boolean
}

/**
 * The company's prepaid credits: what is left, what a check costs, buying more and topping up
 * by itself. Stripe sends the owner back from a pack's checkout with `?credits=<checkout id>`,
 * which is confirmed at once, since the event that reports the payment can arrive after them.
 */
export function CreditsCard({ billing, canManage }: CreditsCardProps) {
  const { t } = useTranslation('settings')
  const { credits } = billing
  const confirm = useConfirmPack()
  const [buying, setBuying] = useState(false)
  const [recharging, setRecharging] = useState(false)
  const [params, setParams] = useSearchParams()
  const handled = useRef(false)
  const level = creditLevel(credits)
  // Credits are sold to a company whose plan is running; the hint is for one with none to fix.
  const canBuy = billing.active
  const needsPlan = !billing.active && billingState(billing) !== 'onHold'

  const paidCheckout = params.get(PACK_CHECKOUT_PARAM)
  useEffect(() => {
    if (!paidCheckout || handled.current) return
    handled.current = true
    setParams({}, { replace: true })
    confirm.mutate(paidCheckout)
  }, [paidCheckout, setParams, confirm])

  const autoPack = credits.packs.find((pack) => pack.key === credits.autoRecharge?.pack)

  return (
    <BillingSection
      icon={Coins}
      section={t('billing.credits.section')}
      sectionHelp={t('billing.credits.sectionHelp')}
      title={t('billing.credits.title')}
      description={t('billing.credits.description')}
    >
      <div className="border-border overflow-hidden rounded-[11px] border">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
          <div
            role="group"
            aria-label={t('billing.credits.balance')}
            className="flex min-w-0 flex-1 basis-60 flex-col gap-2.5"
          >
            <div className="flex items-baseline gap-2.5">
              <span className="text-fg-3 text-[13px]">{t('billing.credits.balance')}</span>
              <span className="text-[24px] leading-tight font-semibold tracking-tight tabular-nums">
                {credits.balance}
              </span>
            </div>
            {/* Under the balance: what a check costs is what says how far the number goes. */}
            <ul
              aria-label={t('billing.credits.costs.label')}
              className="m-0 flex list-none flex-wrap gap-1.5 p-0"
            >
              {PROVIDER_KINDS.map((check) => (
                <li
                  key={check}
                  className="border-border-soft bg-surface-2 text-fg-2 rounded-full border px-2.5 py-1 text-[12px] whitespace-nowrap"
                >
                  {t(`billing.credits.costs.${check}`, { count: credits.costs[check] })}
                </li>
              ))}
            </ul>
          </div>
          {canManage && (
            <Button disabled={!canBuy} onClick={() => setBuying(true)}>
              {t('billing.credits.buy')}
            </Button>
          )}
        </div>

        {level !== 'ok' && (
          <div
            role="status"
            className={cn(
              'flex items-start gap-2.5 px-4 py-3 text-[12.5px]',
              level === 'empty' ? 'bg-error-tint text-error' : 'bg-warning-tint text-warning',
            )}
          >
            <AlertTriangle className="mt-px size-4 shrink-0" aria-hidden />
            <p className="text-fg-2 m-0">{t(`billing.credits.level.${level}`)}</p>
          </div>
        )}
      </div>

      {canManage && needsPlan && (
        <p className="text-fg-4 m-0 text-[12.5px]">{t('billing.credits.needsPlan')}</p>
      )}
      {!canManage && <p className="text-fg-4 m-0 text-[12.5px]">{t('billing.credits.ownerOnly')}</p>}

      <div className="border-border flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[11px] border p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[14px] font-semibold">{t('billing.credits.autoRecharge.title')}</span>
          <span className="text-fg-3 text-[12.5px]">
            {credits.autoRecharge && autoPack
              ? t('billing.credits.autoRecharge.on', {
                  credits: autoPack.credits,
                  below: credits.autoRecharge.below,
                })
              : t('billing.credits.autoRecharge.off')}
          </span>
        </div>
        {canManage && (
          <Button variant="outline" disabled={!canBuy} onClick={() => setRecharging(true)}>
            {credits.autoRecharge
              ? t('billing.credits.autoRecharge.change')
              : t('billing.credits.autoRecharge.setUp')}
          </Button>
        )}
      </div>

      {/* Mounted while open, so each opening starts from what is saved now. */}
      {buying && (
        <BuyCreditsDialog open onOpenChange={setBuying} packs={credits.packs} currency={billing.currency} />
      )}
      {recharging && (
        <AutoRechargeDialog open onOpenChange={setRecharging} credits={credits} currency={billing.currency} />
      )}
    </BillingSection>
  )
}
