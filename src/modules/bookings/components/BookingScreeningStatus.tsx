import { useTranslation } from 'react-i18next'
import { Check, Loader2, ShieldCheck, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useFormatters } from '@/i18n'
import type { BookingScreening } from '../types/booking.types'
import { screeningView, type ScreeningTone } from '../utils/booking.screening'

interface RunCheckButtonProps {
  label: string
  variant: 'primary' | 'outline'
  loading?: boolean
  onClick: () => void
  blockedReason?: string
}

/**
 * The run button, disabled with a tooltip while the renter is still being typed in.
 *
 * The span around it is what makes the tooltip work: a disabled button has
 * `pointer-events: none`, so it never fires the hover the tooltip opens on.
 */
function RunCheckButton({ label, variant, loading, onClick, blockedReason }: RunCheckButtonProps) {
  const button = (
    <Button
      type="button"
      size="sm"
      variant={variant}
      loading={loading}
      disabled={Boolean(blockedReason)}
      onClick={onClick}
    >
      {label}
    </Button>
  )

  if (!blockedReason) return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{button}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[240px]">{blockedReason}</TooltipContent>
    </Tooltip>
  )
}

interface BookingScreeningStatusProps {
  /** The renter's check, when one stands. Undefined until one is found or run. */
  screening?: BookingScreening
  /** True while the renter's existing check is being looked up. */
  loading?: boolean
  onRunCheck?: () => void
  running?: boolean
  /** Why a check cannot be run yet; the button is disabled and shows this on hover. */
  runBlockedReason?: string
  /** Absent for a renter with no saved record yet: the report is fetched by customer. */
  onViewReport?: () => void
  openingReport?: boolean
}

const RING: Record<ScreeningTone, string> = {
  success: 'border-success/40 bg-success-tint/30',
  error: 'border-error/40 bg-error-tint/30',
  pending: 'border-warning/40 bg-warning-tint/30',
  neutral: 'border-border',
}

const ICON: Record<ScreeningTone, string> = {
  success: 'bg-success text-white',
  error: 'bg-error text-white',
  pending: 'bg-warning-tint text-warning',
  neutral: 'bg-surface-3 text-fg-4',
}

const LABEL: Record<ScreeningTone, string> = {
  success: 'text-success',
  error: 'text-error',
  pending: 'text-warning',
  neutral: 'text-fg-4',
}

/**
 * The renter's background check, as it stands while the booking is being taken.
 *
 * A check belongs to the renter rather than to one rental, so a returning customer's recent
 * result is already the answer here — the counter only runs one when there is nothing on file.
 */
export function BookingScreeningStatus({
  screening,
  loading,
  onRunCheck,
  running,
  runBlockedReason,
  onViewReport,
  openingReport,
}: BookingScreeningStatusProps) {
  const { t } = useTranslation('bookings')
  const { shortDate } = useFormatters()
  const view = screeningView(screening)
  const tone = loading ? 'neutral' : view.tone

  function detail() {
    if (loading) return t('verification.background.checking')
    if (!screening) return t('verification.background.none')
    if (view.inProgress) return t('verification.background.running')
    if (screening.completedAt) {
      const when = shortDate(screening.completedAt)
      return view.tone === 'success'
        ? t('verification.background.clearOn', { when })
        : t('verification.background.recordsOn', { when })
    }
    return t(`screening.state.${view.stateKey}`)
  }

  return (
    <div className={cn('rounded-[11px] border p-3.5 transition-colors', RING[tone])}>
      {/* Centred, not top-aligned: the actions sit beside the whole row rather than beside
          its first line, which left them hanging above a two-line status. */}
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-[9px]',
            ICON[tone],
          )}
        >
          {loading || view.inProgress ? (
            <Loader2 className="size-4 animate-spin" />
          ) : tone === 'success' ? (
            <Check className="size-4" strokeWidth={3} />
          ) : tone === 'error' ? (
            <TriangleAlert className="size-4" />
          ) : (
            <ShieldCheck className="size-4" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[14px] font-semibold">
              {t('verification.background.label')}
            </span>
            {screening && !loading && (
              <span
                className={cn('text-[11px] font-bold tracking-wide uppercase', LABEL[tone])}
              >
                {t(`screening.state.${view.stateKey}`)}
              </span>
            )}
          </span>
          <span
            className="text-fg-4 mt-0.5 block text-[12.5px] leading-snug"
            style={{ textWrap: 'pretty' }}
          >
            {detail()}
          </span>

          {/* Checkr's own words on why it stopped — more use to the counter than our wording. */}
          {screening?.failureReason && (
            <span className="text-fg-4 mt-1 block text-[11.5px] italic">
              {screening.failureReason}
            </span>
          )}
        </span>

        <span className="flex shrink-0 items-center gap-2">
          {view.action === 'order' && onRunCheck && (
            <RunCheckButton
              label={t(screening ? 'screening.action.orderAgain' : 'screening.action.order')}
              variant={screening ? 'outline' : 'primary'}
              loading={running}
              onClick={onRunCheck}
              blockedReason={runBlockedReason}
            />
          )}

          {view.canViewReport && screening?.hasReport && onViewReport && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              loading={openingReport}
              onClick={onViewReport}
            >
              {t('screening.action.viewReport')}
            </Button>
          )}
        </span>
      </div>
    </div>
  )
}
