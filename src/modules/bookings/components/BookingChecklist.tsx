import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PanelHeading } from '@/components/layout/PanelHeading'
import type { BookingCheck, BookingCheckStep } from '../types/booking.types'

interface BookingChecklistProps {
  checks: BookingCheckStep[]
  /** Fired with the check the counter chose to act on — verify it, or open what was signed. */
  onAction: (key: BookingCheck) => void
}

/**
 * What still has to happen before the keys change hands, as a running checklist. Completed
 * steps keep their action (staff reopen a signed agreement far more often than they re-sign
 * one), so every row stays useful rather than going inert once it's ticked.
 */
export function BookingChecklist({ checks, onAction }: BookingChecklistProps) {
  const { t } = useTranslation('bookings')

  return (
    <Card className="flex flex-col p-[18px]">
      <PanelHeading title={t('details.checklist.title')} className="mb-3.5" />

      <ol className="flex flex-col">
        {checks.map((check, index) => {
          const last = index === checks.length - 1

          return (
            <li key={check.key} className={cn('relative pl-7', !last && 'pb-4')}>
              {/* Connector runs from under this dot to the next one — omitted on the last row. */}
              {!last && <span aria-hidden className="bg-border absolute top-6 bottom-0 left-[9px] w-px" />}

              <span
                aria-hidden
                className={cn(
                  'absolute top-0.5 left-0 flex size-[19px] items-center justify-center rounded-full',
                  check.done ? 'bg-success text-white' : 'bg-error-tint',
                )}
              >
                {check.done ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : (
                  <span className="bg-error size-[9px] rounded-full" />
                )}
              </span>

              <p className={cn('m-0 text-[12px] font-bold', check.done ? 'text-success' : 'text-error')}>
                {check.done ? t('details.checklist.done') : t('details.checklist.pending')}
              </p>
              <p className="m-0 mt-0.5 text-[13.5px] font-semibold">{t(`details.checks.${check.key}`)}</p>
              <p className="text-fg-4 m-0 mt-0.5 text-[12px]" style={{ textWrap: 'pretty' }}>
                {t(`details.checkHints.${check.key}`)}
              </p>

              <Button
                type="button"
                size="sm"
                variant={check.done ? 'outline' : 'primary'}
                onClick={() => onAction(check.key)}
                className="mt-2 w-full"
              >
                {check.done ? t(`details.checkActions.${check.key}`) : t('details.checklist.verify')}
              </Button>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
