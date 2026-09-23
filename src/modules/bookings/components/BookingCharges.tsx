import { useTranslation } from 'react-i18next'
import { useFormatters } from '@/i18n'
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
  const format = useFormatters()

  /** An ad-hoc fee is named by whoever added it; every other line has a fixed, translated name. */
  function nameFor(line: BookingChargeLine): string {
    return line.key === 'extraFee' ? (line.label ?? '') : t(`details.charges.${line.key}`)
  }

  function captionFor(line: BookingChargeLine): string | null {
    switch (line.key) {
      case 'baseRate':
        return t('details.charges.baseRateDetail', {
          rate: format.currency(line.meta?.rate ?? 0),
          count: line.meta?.days ?? days,
        })
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
