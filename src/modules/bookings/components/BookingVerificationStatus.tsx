import { useTranslation } from 'react-i18next'
import { Check, Loader2, ShieldCheck, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { fromDateValue } from '@/components/ui/date-range-picker'
import { useFormatters } from '@/i18n'
import { TONE_ICON, TONE_LABEL, TONE_RING } from '../constants/verification.constants'
import type { BookingVerification, ProviderKind } from '../types/booking.types'
import { sendsNewLink, verificationView } from '../utils/booking.verification'
import { RunCheckButton } from './RunCheckButton'
import { PolicyLine, ValidityLine } from './VerificationCheckRow'

interface BookingVerificationStatusProps {
  kind?: ProviderKind
  /** The renter's check, when one stands. Undefined until one is found or run. */
  verification?: BookingVerification
  /** True while the renter's existing check is being looked up. */
  loading?: boolean
  onRunCheck?: () => void
  running?: boolean
  /** Why a check cannot be run yet; the button is disabled and shows this on hover. */
  runBlockedReason?: string
  /** Absent for a renter with no saved record yet: the report is fetched by customer. */
  onViewReport?: () => void
  openingReport?: boolean
  /** Hands the renter a link to finish the check on their own device. Blocked as running is. */
  onShare?: () => void
  sharing?: boolean
  /** The rental's last day, as `YYYY-MM-DD`, so cover that runs out before it can be flagged. */
  returnOn?: string
}

/**
 * One of the renter's checks, as it stands while the booking is being taken.
 *
 * A check belongs to the renter rather than to one rental, so a returning customer's recent
 * result is already the answer here — the counter only runs one when there is nothing on file.
 */
export function BookingVerificationStatus({
  kind = 'background',
  verification,
  loading,
  onRunCheck,
  running,
  runBlockedReason,
  onViewReport,
  openingReport,
  onShare,
  sharing,
  returnOn,
}: BookingVerificationStatusProps) {
  const { t } = useTranslation('bookings')
  const { shortDate } = useFormatters()
  const view = verificationView(verification, kind)
  const tone = loading ? 'neutral' : view.tone

  function detail() {
    if (loading) return t(`verification.${kind}.checking`)
    if (!verification) return t(`verification.${kind}.none`)
    if (verification.expired) {
      // A date, not an instant: `new Date('2026-10-01')` is a day early in the US.
      const ended = fromDateValue(verification.validUntil ?? '')
      return ended
        ? t('verification.insurance.expiredOn', { when: shortDate(ended) })
        : t('verification.hint.insurance.expired')
    }
    if (view.inProgress) return t(`verification.${kind}.running`)
    if (verification.completedAt) {
      const when = shortDate(verification.completedAt)
      return view.tone === 'success'
        ? t(`verification.${kind}.clearOn`, { when })
        : t(`verification.${kind}.recordsOn`, { when })
    }
    return t(`verification.state.${kind}.${view.stateKey}`)
  }

  return (
    <div className={cn('rounded-[11px] border p-3.5 transition-colors', TONE_RING[tone])}>
      {/* Centred, not top-aligned: the actions sit beside the whole row rather than beside
          its first line, which left them hanging above a two-line status. */}
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn('flex size-8 shrink-0 items-center justify-center rounded-[9px]', TONE_ICON[tone])}
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
            <span className="text-[14px] font-semibold">{t(`verification.${kind}.label`)}</span>
            {verification && !loading && (
              <span className={cn('text-[11px] font-bold tracking-wide uppercase', TONE_LABEL[tone])}>
                {t(`verification.state.${kind}.${view.stateKey}`)}
              </span>
            )}
          </span>
          <span className="text-fg-4 mt-0.5 block text-[12.5px] leading-snug" style={{ textWrap: 'pretty' }}>
            {detail()}
          </span>

          {/* Only why a check could not run: the card is kept to the verdict while booking. */}
          {verification?.status === 'error' && verification.failureReason && (
            <span className="text-fg-4 mt-1 block text-[11.5px] italic">{verification.failureReason}</span>
          )}
          {verification?.policy && <PolicyLine policy={verification.policy} />}
          {verification && <ValidityLine verification={verification} returnOn={returnOn} />}
        </span>

        <span className="flex shrink-0 items-center gap-2">
          {view.action && onRunCheck && (
            <RunCheckButton
              label={
                view.action === 'resume'
                  ? t('verification.action.insurance.resume')
                  : t(
                      verification
                        ? `verification.action.${kind}.orderAgain`
                        : `verification.action.${kind}.order`,
                    )
              }
              variant={verification ? 'outline' : 'primary'}
              loading={running}
              onClick={onRunCheck}
              blockedReason={runBlockedReason}
            />
          )}

          {view.action && onShare && (
            <RunCheckButton
              label={sendsNewLink(verification) ? t('insuranceLink.actionNew') : t('insuranceLink.action')}
              // The primary action when it is the only one, as for insurance.
              variant={verification || onRunCheck ? 'outline' : 'primary'}
              loading={sharing}
              onClick={onShare}
              blockedReason={runBlockedReason}
            />
          )}

          {view.canViewReport && verification?.hasReport && onViewReport && (
            <Button type="button" size="sm" variant="outline" loading={openingReport} onClick={onViewReport}>
              {t('verification.action.viewReport')}
            </Button>
          )}
        </span>
      </div>
    </div>
  )
}
