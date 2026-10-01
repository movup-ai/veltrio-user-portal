import { useTranslation } from 'react-i18next'
import { useFormatters } from '@/i18n'
import { RatePlanNotice } from '@/modules/vehicles/components/RatePlanNotice'
import { RatePlanTags } from '@/modules/vehicles/components/RatePlanTags'
import type { RatePlan } from '@/modules/vehicles/utils/rate-plan'
import {
  formatRateOptionBasis,
  formatRateOptionMileage,
  rateLineLabel,
} from '@/modules/vehicles/utils/vehicle.utils'

/**
 * The rates the cost engine chose for this trip, read-only: the counter no longer picks one, so
 * the card explains what was picked and why rather than offering a choice.
 */
export function BookingRatePlan({ plan }: { plan: RatePlan | null }) {
  const { t } = useTranslation('bookings')
  const { t: tVehicles } = useTranslation('vehicles')
  const format = useFormatters()

  if (!plan) {
    return (
      <p role="alert" className="text-error text-[14px]">
        {t('form.rate.none')}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <RatePlanTags plan={plan} />
      <ul className="divide-border-soft border-border divide-y rounded-[11px] border">
        {plan.lines.map(({ option, count, amount, cappedHours }) => (
          // A capped day and its hourly remainder share the option's id.
          <li
            key={`${option.id}-${cappedHours ?? 0}`}
            className="flex items-baseline justify-between gap-3 px-3.5 py-2.5"
          >
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold">
                {rateLineLabel({ label: option.label, cappedHours }, tVehicles)}
              </span>
              <span className="text-fg-3 block text-[12.5px]">
                {formatRateOptionBasis(option, tVehicles)} · {formatRateOptionMileage(option, tVehicles)}
              </span>
            </span>
            <span className="shrink-0 text-right tabular-nums">
              <span className="block text-[14px] font-semibold">{format.currency(amount)}</span>
              <span className="text-fg-4 block text-[12.5px]">
                {t('form.rate.unitBreakdown', { count, price: format.currency(option.rate) })}
              </span>
            </span>
          </li>
        ))}
        {plan.discount && (
          <li className="flex items-baseline justify-between gap-3 px-3.5 py-2.5">
            <span className="text-[14px]">
              {tVehicles('ratePlan.discount', { days: plan.discount.minDays, pct: plan.discount.percentOff })}
            </span>
            <span className="text-success shrink-0 text-[14px] font-semibold tabular-nums">
              −{format.currency(plan.discount.amount)}
            </span>
          </li>
        )}
      </ul>
      <RatePlanNotice plan={plan} />
    </div>
  )
}
