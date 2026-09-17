import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { useFormatters } from '@/i18n'
import { BOOKING_EXTRAS, type BookingExtraKey } from '../types/booking.types'

interface BookingExtrasPickerProps {
  selected: BookingExtraKey[]
  onChange: (next: BookingExtraKey[]) => void
  /** Rental days, so each add-on can show what it costs for this trip rather than a bare day rate. */
  days: number
}

export function BookingExtrasPicker({ selected, onChange, days }: BookingExtrasPickerProps) {
  const { t } = useTranslation('bookings')
  const format = useFormatters()

  function toggle(key: BookingExtraKey) {
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key])
  }

  return (
    <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
      {BOOKING_EXTRAS.map((extra) => {
        const checked = selected.includes(extra.key)

        return (
          <label
            key={extra.key}
            className={cn(
              'bg-surface flex cursor-pointer items-start gap-2.5 rounded-[11px] border p-3 transition-colors',
              checked ? 'border-primary bg-tint' : 'border-border hover:border-fg-4 hover:bg-surface-2',
            )}
          >
            <Checkbox checked={checked} onCheckedChange={() => toggle(extra.key)} className="mt-0.5" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold">{t(`extras.${extra.key}.label`)}</span>
              <span className="text-fg-4 block text-[11.5px]">{t(`extras.${extra.key}.description`)}</span>
              <span className="text-fg-3 mt-1 block text-[11.5px] tabular-nums">
                {t('form.extras.pricing', {
                  perDay: format.currency(extra.pricePerDay),
                  total: format.currency(extra.pricePerDay * days),
                })}
              </span>
            </span>
          </label>
        )
      })}
    </div>
  )
}
