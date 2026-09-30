import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { BookingCheck, BookingCheckStep, BookingScreening } from '../types/booking.types'
import { BackgroundCheckDot, BackgroundCheckRow } from './BackgroundCheckRow'

interface BookingChecklistProps {
  checks: BookingCheckStep[]
  /** The background check's real state. Absent when none has been ordered. */
  screening?: BookingScreening
  ordering: boolean
  openingReport: boolean
  onOrderScreening: () => void
  onViewScreeningReport: () => void
  /** Fired with the check the counter chose to act on — verify it, or open what was signed. */
  onAction: (key: BookingCheck) => void
}

/**
 * What still has to happen before the keys change hands.
 *
 * Tiles rather than a stacked timeline: this sits inside the renter card in the wide column,
 * where one check per row left every hint and button stretched across ~900px. Three abreast
 * keeps each to a readable measure and reads as a set of things to clear.
 *
 * No Card of its own — the renter card supplies the frame.
 */
export function BookingChecklist({
  checks,
  screening,
  ordering,
  openingReport,
  onOrderScreening,
  onViewScreeningReport,
  onAction,
}: BookingChecklistProps) {
  const { t } = useTranslation('bookings')

  return (
    <ol className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {checks.map((check) => {
        const isBackground = check.key === 'background'

        return (
          <li
            key={check.key}
            className="border-border-soft bg-surface-2 flex flex-col rounded-[10px] border p-3"
          >
            {/* The status row is the only indented thing in the tile: the dot leads it, and the
                title, hint and button below all start at the tile's padding edge. */}
            <div className="flex items-center gap-1.5">
              {isBackground ? (
                <BackgroundCheckDot screening={screening} />
              ) : (
                <>
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-[16px] shrink-0 items-center justify-center rounded-full',
                      check.done ? 'bg-success text-white' : 'bg-error-tint',
                    )}
                  >
                    {check.done ? (
                      <Check className="size-2.5" strokeWidth={3} />
                    ) : (
                      <span className="bg-error size-[7px] rounded-full" />
                    )}
                  </span>
                  <p
                    className={cn(
                      'm-0 text-[11px] font-bold tracking-wide uppercase',
                      check.done ? 'text-success' : 'text-error',
                    )}
                  >
                    {check.done ? t('details.checklist.done') : t('details.checklist.pending')}
                  </p>
                </>
              )}
            </div>

            {/* flex-1 so the tiles in a row share a height and their buttons line up. */}
            <div className="mt-2 flex flex-1 flex-col">
              {isBackground ? (
                <BackgroundCheckRow
                  screening={screening}
                  ordering={ordering}
                  openingReport={openingReport}
                  onOrder={onOrderScreening}
                  onViewReport={onViewScreeningReport}
                />
              ) : (
                <>
                  <p className="m-0 text-[13px] font-semibold">{t(`details.checks.${check.key}`)}</p>
                  <p
                    className="text-fg-4 m-0 mt-1 text-[11.5px] leading-snug"
                    style={{ textWrap: 'pretty' }}
                  >
                    {t(`details.checkHints.${check.key}`)}
                  </p>

                  <Button
                    type="button"
                    size="sm"
                    variant={check.done ? 'outline' : 'primary'}
                    onClick={() => onAction(check.key)}
                    className="mt-auto w-full"
                  >
                    {check.done ? t(`details.checkActions.${check.key}`) : t('details.checklist.verify')}
                  </Button>
                </>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
