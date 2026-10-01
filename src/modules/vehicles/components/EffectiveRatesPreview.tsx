import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFormatters } from '@/i18n'
import { cn } from '@/lib/utils'
import type { DiscountTier, RateOption } from '../types/vehicle.types'
import { isAutomatic, planRental, planTotal, previewDays } from '../utils/rate-plan'
import { RatePlanTags } from './RatePlanTags'

/** Rows still being typed would price as $0 or NaN; the preview leaves them out until they are whole. */
function priceable(options: RateOption[]): RateOption[] {
  return options.filter(
    (o) =>
      Number.isFinite(o.rate) &&
      o.rate > 0 &&
      (o.basis !== 'fixed' || (Number.isInteger(o.blockDuration) && (o.blockDuration ?? 0) > 0)),
  )
}

function complete(tiers: DiscountTier[]): DiscountTier[] {
  return tiers.filter((t) => Number.isInteger(t.minDays) && t.minDays > 0 && Number.isInteger(t.percentOff))
}

/**
 * What a renter would pay for common trip lengths under the rates and discounts being edited —
 * the cost engine's rules, readable without the docs. Collapsed by default: it is a check, not a field.
 */
interface EffectiveRatesPreviewProps {
  options: RateOption[]
  tiers: DiscountTier[]
  hoursPerDay: number
}

export function EffectiveRatesPreview({ options, tiers, hoursPerDay }: EffectiveRatesPreviewProps) {
  const { t } = useTranslation('vehicles')
  const format = useFormatters()
  const [open, setOpen] = useState(false)

  const usable = priceable(options)
  const usableTiers = complete(tiers)
  // Values arrive as typed, before validation, so a length the engine refuses is skipped, not shown.
  const rows = previewDays(usable, usableTiers).flatMap((days) => {
    const plan = planRental(usable, usableTiers, days * 24, hoursPerDay)
    return plan ? [{ days, plan }] : []
  })

  return (
    <div className="border-border rounded-[9px] border">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="text-fg-2 hover:bg-surface-2 flex w-full items-center gap-2 rounded-[9px] px-3.5 py-2.5 text-left text-[13px]"
      >
        <ChevronRight className={cn('size-4 transition-transform', open && 'rotate-90')} aria-hidden />
        {open ? t('effectiveRates.hide') : t('effectiveRates.show')}
      </button>

      {open && (
        <div className="border-border-soft border-t px-3.5 py-2">
          {usable.length === 0 ? (
            <p className="text-fg-4 py-1.5 text-[12.5px]">{t('effectiveRates.empty')}</p>
          ) : (
            <ul className="divide-border-soft divide-y">
              {rows.map(({ days, plan }) => {
                return (
                  <li key={days} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold">
                        {t('effectiveRates.rental', { count: days })}
                      </span>
                      <RatePlanTags plan={plan} />
                    </span>
                    <span className="text-[13px] font-semibold tabular-nums">
                      {format.currency(planTotal(plan))}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          {rows.some(({ plan }) => isAutomatic(plan)) && (
            <p className="text-fg-4 py-1.5 text-[12px]">
              {t('effectiveRates.autoNote', { count: hoursPerDay })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
