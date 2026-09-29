import { useTranslation } from 'react-i18next'
import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useFormatters } from '@/i18n'
import type { BookingScreening } from '../types/booking.types'
import { screeningView, type ScreeningTone } from '../utils/booking.screening'

interface BackgroundCheckRowProps {
  screening?: BookingScreening
  ordering: boolean
  openingReport: boolean
  onOrder: () => void
  onViewReport: () => void
}

const DOT: Record<ScreeningTone, string> = {
  success: 'bg-success text-white',
  error: 'bg-error-tint',
  pending: 'bg-warning-tint',
  neutral: 'bg-neutral-tint',
}

const LABEL: Record<ScreeningTone, string> = {
  success: 'text-success',
  error: 'text-error',
  pending: 'text-warning',
  neutral: 'text-fg-4',
}

/**
 * The checklist dot for a background check, with its status beside it. A component rather than
 * a class-and-icon helper so the checklist can place it without knowing about screenings.
 */
export function BackgroundCheckDot({ screening }: { screening?: BookingScreening }) {
  const { t } = useTranslation('bookings')
  const view = screeningView(screening)
  const tone = view.tone

  return (
    <>
      <span
        aria-hidden
        className={cn(
          'flex size-[16px] shrink-0 items-center justify-center rounded-full',
          DOT[tone],
        )}
      >
        {tone === 'success' ? (
          <Check className="size-2.5" strokeWidth={3} />
        ) : tone === 'pending' ? (
          // Spinning while Checkr works, so a check in flight does not read as a failed one.
          <Loader2 className="text-warning size-2.5 animate-spin" />
        ) : (
          <span className={cn('size-[7px] rounded-full', tone === 'error' ? 'bg-error' : 'bg-fg-4')} />
        )}
      </span>
      <p className={cn('m-0 text-[11px] font-bold tracking-wide uppercase', LABEL[tone])}>
        {t(`screening.state.${view.stateKey}`)}
      </p>
    </>
  )
}

/**
 * The background check row of the pre-handover checklist, wired to Checkr.
 *
 * Unlike the rows beside it this one has real state behind it, so it shows where the check
 * actually is rather than a tick derived from how far along the booking is.
 */
export function BackgroundCheckRow({
  screening,
  ordering,
  openingReport,
  onOrder,
  onViewReport,
}: BackgroundCheckRowProps) {
  const { t } = useTranslation('bookings')
  const { shortDate } = useFormatters()
  const view = screeningView(screening)

  // The status label is rendered by BackgroundCheckDot, beside the dot it describes.
  return (
    <>
      <p className="m-0 text-[13px] font-semibold">{t('screening.title')}</p>
      <p className="text-fg-4 m-0 mt-1 text-[11.5px] leading-snug" style={{ textWrap: 'pretty' }}>
        {t(`screening.hint.${view.stateKey}`)}
      </p>

      {/* Checkr's own words on why it stopped — more use to the counter than our wording. */}
      {screening?.failureReason && (
        <p className="text-fg-4 m-0 mt-1 text-[11.5px] italic">{screening.failureReason}</p>
      )}
      {screening?.reused && screening.completedAt && (
        <p className="text-fg-4 m-0 mt-1 text-[11.5px]">
          {t('screening.reusedOn', { when: shortDate(screening.completedAt) })}
        </p>
      )}

      {/* mt-auto pins the buttons to the bottom so they align across tiles of unequal height. */}
      <div className="mt-auto flex flex-col gap-1.5 pt-2">
        {view.action === 'order' && (
          <Button
            type="button"
            size="sm"
            variant="primary"
            loading={ordering}
            onClick={onOrder}
            className="w-full"
          >
            {t(screening ? 'screening.action.orderAgain' : 'screening.action.order')}
          </Button>
        )}

        {view.canViewReport && screening?.hasReport && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            loading={openingReport}
            onClick={onViewReport}
            className="w-full"
          >
            {t('screening.action.viewReport')}
          </Button>
        )}
      </div>
    </>
  )
}
