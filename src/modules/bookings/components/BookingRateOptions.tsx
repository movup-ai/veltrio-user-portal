import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useFormatters } from '@/i18n'
import type { RateOption } from '@/modules/vehicles/types/vehicle.types'
import { formatRateOptionBasis, formatRateOptionMileage } from '@/modules/vehicles/utils/vehicle.utils'
import { billableUnits } from '../utils/booking.pricing'

interface BookingRateOptionsProps {
  options: RateOption[]
  selectedId: string
  onSelect: (option: RateOption) => void
  /** Rental length, used to show what each option would actually cost for this trip. */
  hours: number
  invalid?: boolean
}

/** Rate options for the chosen vehicle, each priced against the trip length already entered. */
export function BookingRateOptions({ options, selectedId, onSelect, hours, invalid }: BookingRateOptionsProps) {
  const { t } = useTranslation('bookings')
  const { t: tVehicles } = useTranslation('vehicles')
  const format = useFormatters()

  if (options.length === 0) {
    return <p className="text-fg-4 text-[13px]">{t('form.rate.none')}</p>
  }

  return (
    <div
      className={cn('grid gap-2.5', invalid && 'rounded-[11px] outline-2 outline-offset-4 outline-[var(--color-error)]')}
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}
      role="radiogroup"
      aria-label={t('form.rate.pick')}
    >
      {options.map((option) => {
        const selected = option.id === selectedId
        const units = billableUnits(option, hours)

        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(option)}
            className={cn(
              'bg-surface flex flex-col gap-1.5 rounded-[11px] border p-3 text-left transition-colors',
              selected ? 'border-primary bg-tint' : 'border-border hover:border-fg-4 hover:bg-surface-2',
            )}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-[13.5px] font-semibold">{option.label}</span>
              <span className="text-[13.5px] font-bold tabular-nums">{format.currency(option.rate * units)}</span>
            </span>
            <span className="text-fg-3 flex flex-wrap items-center gap-x-1.5 text-[12px]">
              <span>{formatRateOptionBasis(option, tVehicles)}</span>
              <span aria-hidden>·</span>
              <span>{formatRateOptionMileage(option, tVehicles)}</span>
            </span>
            <span className="text-fg-4 text-[11.5px] tabular-nums">
              {t('form.rate.unitBreakdown', { count: units, price: format.currency(option.rate) })}
            </span>
          </button>
        )
      })}
    </div>
  )
}
