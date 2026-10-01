import { useTranslation } from 'react-i18next'
import { useFormatters } from '@/i18n'
import { rateLineLabel } from '@/modules/vehicles/utils/vehicle.utils'
import type { BookingChargeLine } from '../types/booking.types'

interface BookingChargeLinesProps {
  charges: BookingChargeLine[]
  days: number
}

/**
 * The itemized quote, as a bare list. Lives inside the payment card rather than a card of its
 * own — split across two panels, the total appeared twice and the two could drift apart.
 */
export function BookingChargeLines({ charges, days }: BookingChargeLinesProps) {
  const { t } = useTranslation('bookings')
  const { t: tVehicles } = useTranslation('vehicles')
  const format = useFormatters()

  /** A fee or a live booking's rate carries its own name; every other line has a fixed, translated one. */
  function nameFor(line: BookingChargeLine): string {
    if (line.key === 'extraFee') return line.label ?? ''
    if (line.key === 'baseRate' && line.label)
      return rateLineLabel({ label: line.label, cappedHours: line.meta?.cappedHours }, tVehicles)
    return line.label ?? t(`details.charges.${line.key}`)
  }

  function captionFor(line: BookingChargeLine): string | null {
    switch (line.key) {
      case 'baseRate':
        // A live booking's line counts the rate's own units (2 weeks), not days.
        return line.meta?.count != null
          ? t('details.charges.baseRateUnits', {
              rate: format.currency(line.meta.rate ?? 0),
              count: line.meta.count,
            })
          : t('details.charges.baseRateDetail', {
              rate: format.currency(line.meta?.rate ?? 0),
              count: line.meta?.days ?? days,
            })
      case 'discount':
        return t('details.charges.discountDetail', { days: line.meta?.days ?? 0, pct: line.meta?.pct ?? 0 })
      case 'additionalDriver':
        return t('details.charges.additionalDriverDetail', {
          count: line.meta?.count ?? 1,
          rate: format.currency(line.meta?.rate ?? 0),
        })
      case 'taxes':
        return t('details.charges.taxesDetail', { pct: line.meta?.pct ?? 0 })
      default:
        return null
    }
  }

  return (
    <div className="divide-border-soft flex flex-col divide-y">
      {charges.map((line, index) => {
        const caption = captionFor(line)

        return (
          <div key={`${line.key}-${index}`} className="flex items-start justify-between gap-3 py-2">
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold">{nameFor(line)}</span>
              {caption && <span className="text-fg-4 block text-[11.5px]">{caption}</span>}
            </span>
            <span className="shrink-0 text-[13px] font-semibold tabular-nums">
              {format.currency(line.amount)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
