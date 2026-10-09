import { fromCents, toCents } from '@/lib/money'
import type { CancelReason } from '@/modules/bookings/types/booking.types'
import type { CancellationQuote } from '../types/booking-payment.types'

/** Reasons that are the company's doing, where the renter is owed everything whatever the policy. */
const COMPANY_SIDE: readonly CancelReason[] = ['vehicle_unavailable']

/**
 * What the refund starts at. The booking's policy when the renter is the one cancelling;
 * everything when the company is, or when it stated no policy to keep anything under.
 */
export function suggestedRefund(quote: CancellationQuote, reason: CancelReason | undefined): number {
  if (reason && COMPANY_SIDE.includes(reason)) return quote.paid
  return quote.policyRefund ?? quote.paid
}

/** The ready-made answers to how much goes back; `custom` is the counter typing its own. */
type RefundPreset = 'full' | 'policy' | 'none'
export type RefundChoice = RefundPreset | 'custom'

/**
 * What each ready-made answer refunds. The policy's own figure is only among them when it is
 * a third answer: at 100% or 0% it is the same as everything or nothing, which are already there.
 */
export function refundPresets(quote: CancellationQuote): { key: RefundPreset; amount: number }[] {
  const partial =
    quote.policyRefund !== undefined && quote.policyRefund > 0 && quote.policyRefund < quote.paid
  return [
    { key: 'full', amount: quote.paid },
    ...(partial ? [{ key: 'policy' as const, amount: quote.policyRefund ?? 0 }] : []),
    { key: 'none', amount: 0 },
  ]
}

/** The answer the dialog starts on, which is the one `suggestedRefund` comes to. */
export function suggestedPreset(quote: CancellationQuote, reason: CancelReason | undefined): RefundPreset {
  const amount = suggestedRefund(quote, reason)
  if (amount >= quote.paid) return 'full'
  return amount <= 0 ? 'none' : 'policy'
}

/**
 * The answer in force: the counter's own while it is still one of those offered, else the
 * suggested one. A quote read again can take the policy's figure out of the answers.
 */
export function refundChoice(
  picked: RefundChoice | undefined,
  presets: { key: RefundPreset }[],
  suggested: RefundPreset,
): RefundChoice {
  const offered = picked === 'custom' || presets.some((preset) => preset.key === picked)
  return picked && offered ? picked : suggested
}

/**
 * Whether the starting answer has something behind it worth marking as suggested: the booking's
 * policy, or the company being the one at fault. Without either it is only a default.
 */
export function hasSuggestion(quote: CancellationQuote, reason: CancelReason | undefined): boolean {
  return quote.policy !== undefined || Boolean(reason && COMPANY_SIDE.includes(reason))
}

/**
 * Where a refund of `refund` goes, as the API will send it: back to the card first, and only
 * then out of what was paid in person, which the counter hands back itself.
 */
export function refundSplit(quote: CancellationQuote, refund: number) {
  const paid = toCents(quote.paid)
  const back = Math.min(Math.max(toCents(refund), 0), paid)
  const toCard = Math.min(back, paid - toCents(quote.paidByHand))
  return { toCard: fromCents(toCard), byHand: fromCents(back - toCard), kept: fromCents(paid - back) }
}
