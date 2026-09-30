import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  SHAREABLE_KINDS,
  type BookingCheckStep,
  type BookingVerification,
  type ProviderKind,
  type VerificationKind,
} from '../types/booking.types'
import { VerificationCheckDot, VerificationCheckRow } from './VerificationCheckRow'

interface BookingChecklistProps {
  checks: BookingCheckStep[]
  /**
   * What each kind has actually been verified as, keyed by kind. A kind missing from this map
   * has no provider behind it — the counter clears it themselves.
   */
  verifications: Partial<Record<ProviderKind, BookingVerification>>
  /** Kinds a provider answers for, so the tile shows real state rather than a manual tick. */
  providerKinds: readonly ProviderKind[]
  ordering?: ProviderKind
  openingReport: boolean
  onOrder: (kind: ProviderKind) => void
  onViewReport: (kind: ProviderKind) => void
  /** Kinds the renter can finish on their own device are given a link to send them. */
  onShare?: (kind: ProviderKind) => void
  sharing?: ProviderKind
  /** Fired for a kind with no provider — verify it, or open what was signed. */
  onAction: (kind: VerificationKind) => void
}

/**
 * What still has to happen before the keys change hands.
 *
 * Tiles rather than a stacked timeline: this sits inside the renter card in the wide column,
 * where one check per row left every hint and button stretched across ~900px. Three abreast
 * keeps each to a readable measure and reads as a set of things to clear.
 *
 * Every tile is the same shape. A kind a provider answers for shows that provider's verdict;
 * one without shows a tick the counter sets. Nothing here knows which provider is which —
 * adding a fourth kind means adding it to `providerKinds`, not a branch.
 *
 * No Card of its own — the renter card supplies the frame.
 */
export function BookingChecklist({
  checks,
  verifications,
  providerKinds,
  ordering,
  openingReport,
  onOrder,
  onViewReport,
  onShare,
  sharing,
  onAction,
}: BookingChecklistProps) {
  const { t } = useTranslation('bookings')

  return (
    <ol className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {checks.map((check) => {
        const kind = (providerKinds as readonly VerificationKind[]).includes(check.key)
          ? (check.key as ProviderKind)
          : undefined

        return (
          <li
            key={check.key}
            className="border-border-soft bg-surface-2 flex flex-col rounded-[10px] border p-3"
          >
            {/* The status row is the only indented thing in the tile: the dot leads it, and the
                title, hint and button below all start at the tile's padding edge. */}
            <div className="flex items-center gap-1.5">
              {kind ? (
                <VerificationCheckDot kind={kind} verification={verifications[kind]} />
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
              {kind ? (
                <VerificationCheckRow
                  kind={kind}
                  verification={verifications[kind]}
                  ordering={ordering === kind}
                  openingReport={openingReport}
                  onOrder={() => onOrder(kind)}
                  onViewReport={() => onViewReport(kind)}
                  onShare={
                    onShare && SHAREABLE_KINDS.includes(kind) ? () => onShare(kind) : undefined
                  }
                  sharing={sharing === kind}
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
                    {check.done
                      ? t(`details.checkActions.${check.key}`)
                      : t('details.checklist.verify')}
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
