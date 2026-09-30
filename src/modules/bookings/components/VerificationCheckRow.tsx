import { useTranslation } from 'react-i18next'
import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { fromDateValue } from '@/components/ui/date-range-picker'
import { useFormatters } from '@/i18n'
import type { BookingVerification, ProviderKind } from '../types/booking.types'
import { TONE_DOT, TONE_LABEL } from '../constants/verification.constants'
import { sendsNewLink, verificationView } from '../utils/booking.verification'

interface VerificationCheckRowProps {
  kind: ProviderKind
  verification?: BookingVerification
  ordering: boolean
  openingReport: boolean
  /** Absent for a kind whose link is sent instead, which then takes the primary button. */
  onOrder?: () => void
  onViewReport: () => void
  /** Hands the renter a link to finish the check on their own device, where the kind allows. */
  onShare?: () => void
  sharing?: boolean
}

/**
 * Which policy an insurance verdict was read from - "State Farm · SF-123456 · Expires 1 Jan" -
 * so the counter can tell the renter which cover fell short, or when it runs out.
 */
export function PolicyLine({ policy }: { policy: NonNullable<BookingVerification['policy']> }) {
  const { t } = useTranslation('bookings')
  const { shortDate } = useFormatters()
  // A date, not an instant: `new Date('2027-01-01')` is UTC midnight, a day early in the US.
  const expires = policy.expiresOn ? fromDateValue(policy.expiresOn) : undefined
  const parts = [
    policy.carrier,
    policy.policyNumber,
    expires && t('verification.policyExpires', { date: shortDate(expires) }),
  ].filter(Boolean)

  if (parts.length === 0) return null
  return <span className="text-fg-3 mt-1 block text-[11.5px]">{parts.join(' · ')}</span>
}

/**
 * The checklist dot for a provider-backed check, with its status beside it. A component rather
 * than a class-and-icon helper so the checklist can place it without knowing about providers.
 */
export function VerificationCheckDot({
  kind,
  verification,
}: {
  kind: ProviderKind
  verification?: BookingVerification
}) {
  const { t } = useTranslation('bookings')
  const view = verificationView(verification, kind)
  const tone = view.tone

  return (
    <>
      <span
        aria-hidden
        className={cn(
          'flex size-[16px] shrink-0 items-center justify-center rounded-full',
          TONE_DOT[tone],
        )}
      >
        {tone === 'success' ? (
          <Check className="size-2.5" strokeWidth={3} />
        ) : tone === 'pending' ? (
          // Spinning while the provider works, so a check in flight does not read as failed.
          <Loader2 className="text-warning size-2.5 animate-spin" />
        ) : (
          <span className={cn('size-[7px] rounded-full', tone === 'error' ? 'bg-error' : 'bg-fg-4')} />
        )}
      </span>
      <p className={cn('m-0 text-[11px] font-bold tracking-wide uppercase', TONE_LABEL[tone])}>
        {t(`verification.state.${kind}.${view.stateKey}`)}
      </p>
    </>
  )
}

/**
 * A checklist row for a kind a provider answers for.
 *
 * Unlike the rows beside it this one has real state behind it, so it shows where the check
 * actually is rather than a tick derived from how far along the booking is. The wording is
 * per kind; the states and the buttons are the same for all of them.
 */
export function VerificationCheckRow({
  kind,
  verification,
  ordering,
  openingReport,
  onOrder,
  onViewReport,
  onShare,
  sharing,
}: VerificationCheckRowProps) {
  const { t } = useTranslation('bookings')
  const view = verificationView(verification, kind)
  // Filled only when there is no result to act on, as the manual tiles beside it do.
  const filled = view.stateKey === 'notStarted' || view.stateKey === 'error'

  const orderLabel =
    view.action === 'resume'
      ? t('verification.action.insurance.resume')
      : verification
        ? t(`verification.action.${kind}.orderAgain`)
        : t(`verification.action.${kind}.order`)

  // The status label is rendered by VerificationCheckDot, beside the dot it describes.
  return (
    <>
      <p className="m-0 text-[13px] font-semibold">{t(`details.checks.${kind}`)}</p>
      <p className="text-fg-4 m-0 mt-1 text-[11.5px] leading-snug" style={{ textWrap: 'pretty' }}>
        {t(`verification.hint.${kind}.${view.stateKey}`)}
      </p>

      {/* Only why a check could not run: a verdict's tile is kept to the result. */}
      {verification?.status === 'error' && verification.failureReason && (
        <p className="text-fg-4 m-0 mt-1 text-[11.5px] italic">{verification.failureReason}</p>
      )}
      {verification?.policy && <PolicyLine policy={verification.policy} />}

      {/* mt-auto pins the buttons to the bottom so they align across tiles of unequal height;
          side by side so a tile with two actions is no taller than one with a single. */}
      <div className="mt-auto flex gap-1.5 pt-2">
        {view.action && onOrder && (
          <Button
            type="button"
            size="sm"
            variant={filled ? 'primary' : 'outline'}
            loading={ordering}
            onClick={onOrder}
            className="min-w-0 flex-1"
          >
            {orderLabel}
          </Button>
        )}

        {view.action && onShare && (
          <Button
            type="button"
            size="sm"
            variant={filled && !onOrder ? 'primary' : 'outline'}
            loading={sharing}
            onClick={onShare}
            className="min-w-0 flex-1"
          >
            {sendsNewLink(verification) ? t('insuranceLink.actionNew') : t('insuranceLink.action')}
          </Button>
        )}

        {view.canViewReport && verification?.hasReport && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            loading={openingReport}
            onClick={onViewReport}
            className="min-w-0 flex-1"
          >
            {t('verification.action.viewReport')}
          </Button>
        )}
      </div>
    </>
  )
}
