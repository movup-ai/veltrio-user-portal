import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useFormatters } from '@/i18n'
import type { ChangeQuote } from '../types/booking.types'
import { changeEffects, changeMoney } from '../utils/booking.change'
import { rentalDuration } from '../utils/booking.details'
import { durationLabel } from '../utils/booking.utils'
import { BookingEffects } from './BookingEffects'

interface BookingChangeSummaryProps {
  /** Absent until a change is priced: the rows are there all along, their figures are not. */
  quote: ChangeQuote | undefined
  /** A price is on its way, for the first time or over the one shown. */
  loading: boolean
  renterName: string
  /** What the booking comes to now, to show before any price says so. */
  currentTotal?: number
  /** The dates dialog says how long the rental becomes; a swap leaves that as it was. */
  showLength?: boolean
  /** The dates picked, for the length: said at once, without waiting for a price. */
  dates?: { pickupAt: string; returnAt: string }
  /** The price was kept on purpose, so there are no new rates to show. */
  priceKept?: boolean
  /** Drivers alone leave the rental's rates as they are, so there is no rate to state. */
  hideRates?: boolean
}

/** Where a figure will be once there is one. A dash, not a shimmer: that read as a flicker. */
const NONE = '—'

function Line({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <dt className="text-fg-2 text-[13px]">{label}</dt>
      <dd
        className={
          strong ? 'm-0 text-[15px] font-bold tabular-nums' : 'm-0 text-right text-[13px] tabular-nums'
        }
      >
        {value}
      </dd>
    </div>
  )
}

/**
 * What a change of dates or vehicle comes to before it is made: the new price, what that leaves
 * to pay or to refund, and everything else the change takes back with it.
 */
export function BookingChangeSummary({
  quote,
  loading,
  renterName,
  currentTotal,
  showLength,
  dates,
  priceKept,
  hideRates,
}: BookingChangeSummaryProps) {
  const { t } = useTranslation('bookings')
  const format = useFormatters()
  const money = quote && changeMoney(quote)
  const effects = quote ? changeEffects(quote) : []

  return (
    <div
      className={cn(
        'flex flex-col gap-3.5 transition-opacity',
        // Only a price slow to come dims the last one: fading at once, every change blinked.
        loading && quote && 'opacity-60 delay-300',
      )}
      aria-busy={loading}
    >
      <dl className="border-border-soft divide-border-soft m-0 flex flex-col divide-y rounded-[10px] border px-3.5">
        {showLength && (
          <Line
            label={t('details.change.quote.length')}
            value={
              dates
                ? durationLabel(
                    rentalDuration({ from: new Date(dates.pickupAt), to: new Date(dates.returnAt) }),
                    t,
                  )
                : NONE
            }
          />
        )}
        {!hideRates && (
          <Line
            label={t('details.change.quote.rates')}
            value={
              priceKept
                ? t('details.change.quote.priceKept')
                : quote
                  ? quote.lines
                      .map((line) => t('details.change.quote.line', { label: line.label, count: line.count }))
                      .join(' + ')
                  : NONE
            }
          />
        )}
        <Line
          label={t('details.change.quote.currentTotal')}
          value={
            quote
              ? format.currency(quote.previousTotal)
              : currentTotal === undefined
                ? NONE
                : format.currency(currentTotal)
          }
        />
        <Line
          label={t('details.change.quote.newTotal')}
          value={quote ? format.currency(quote.total) : NONE}
        />
        {/* Only when it moves: a change of dates leaves the deposit the booking was made with. */}
        {quote && quote.deposit !== quote.previousDeposit && (
          <Line
            label={t('details.change.quote.deposit')}
            value={t('details.change.quote.depositChange', {
              from: format.currency(quote.previousDeposit),
              to: format.currency(quote.deposit),
            })}
          />
        )}
        <Line
          strong
          label={t(`details.change.quote.${money?.kind ?? 'toPay'}`)}
          value={money ? format.currency(money.amount) : NONE}
        />
      </dl>

      {effects.length > 0 && (
        <BookingEffects
          title={t('details.change.effects.title')}
          lines={effects.map((effect) =>
            t(`details.change.effects.${effect}`, {
              name: renterName,
              amount: format.currency(quote?.overpaid ?? 0),
            }),
          )}
        />
      )}
    </div>
  )
}
