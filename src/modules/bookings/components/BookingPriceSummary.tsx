import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { useFormatters } from '@/i18n'
import type { RateOption } from '@/modules/vehicles/types/vehicle.types'
import { formatRateOptionBasis } from '@/modules/vehicles/utils/vehicle.utils'
import type { BookingPricing } from '../utils/booking.pricing'

function Line({ label, value, hint, muted }: { label: string; value: string; hint?: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="min-w-0">
        <span className={cn('block text-[12.5px]', muted ? 'text-fg-4' : 'text-fg-2')}>{label}</span>
        {hint && <span className="text-fg-4 block text-[11px] tabular-nums">{hint}</span>}
      </span>
      <span className={cn('shrink-0 text-[12.5px] tabular-nums', muted ? 'text-fg-4' : 'font-semibold')}>{value}</span>
    </div>
  )
}

interface BookingPriceSummaryProps {
  pricing: BookingPricing
  option: RateOption
  className?: string
}

/** The running charge breakdown — shown live beside the wizard and again on the review step. */
export function BookingPriceSummary({ pricing, option, className }: BookingPriceSummaryProps) {
  const { t } = useTranslation('bookings')
  const { t: tVehicles } = useTranslation('vehicles')
  const format = useFormatters()

  return (
    <Card className={cn('p-4 shadow-none', className)}>
      <p className="text-[14px] font-semibold">{t('form.summary.title')}</p>
      <p className="text-fg-4 mt-0.5 text-[11.5px]">
        {t('form.summary.duration', { count: pricing.days, hours: Math.round(pricing.hours) })}
      </p>

      <div className="divide-border-soft mt-3 divide-y">
        <Line
          label={t('form.summary.rental', { label: option.label, basis: formatRateOptionBasis(option, tVehicles) })}
          hint={t('form.summary.units', { count: pricing.units, price: format.currency(option.rate) })}
          value={format.currency(pricing.rentalSubtotal)}
        />

        {pricing.extras.map((extra) => (
          <Line
            key={extra.key}
            label={`${t(`extras.${extra.key}.label`)} · ${t('form.summary.extraDays', { count: pricing.days })}`}
            value={format.currency(extra.amount)}
          />
        ))}

        <Line label={t('form.summary.subtotal')} value={format.currency(pricing.subtotal)} />

        {pricing.taxRatePct > 0 && (
          <Line label={t('form.summary.tax', { rate: pricing.taxRatePct })} value={format.currency(pricing.tax)} />
        )}

        <div className="flex items-baseline justify-between gap-3 pt-2.5">
          <span className="text-[13px] font-semibold">{t('form.summary.total')}</span>
          <span className="font-[family-name:var(--font-display)] text-[20px] font-bold tracking-tight tabular-nums">
            {format.currency(pricing.total)}
          </span>
        </div>
      </div>

      <div className="border-border-soft mt-3 flex flex-col gap-1 border-t pt-3">
        {/* Authorized on the card at pickup and released on return — deliberately outside the total. */}
        <Line label={t('form.summary.deposit')} value={format.currency(pricing.deposit)} muted />
        <Line
          label={t('form.summary.mileage')}
          value={
            pricing.includedMiles == null
              ? tVehicles('rateOptions.unlimitedMiles')
              : t('form.summary.milesIncluded', { count: pricing.includedMiles })
          }
          muted
        />
      </div>
    </Card>
  )
}
