import type { Tone } from '@/lib/tone'
import type { BillingInterval, BillingState, ChargeStatus } from '../types/billing.types'

export const BILLING_INTERVALS: readonly BillingInterval[] = ['month', 'year']

/** How strongly a subscription state reads, on its badge and its notice strip. */
export const BILLING_STATE_TONE: Record<BillingState, Tone> = {
  off: 'neutral',
  none: 'info',
  trialing: 'info',
  active: 'success',
  pastDue: 'warning',
  ending: 'warning',
  onHold: 'error',
  ended: 'error',
}

/** What every plan includes, in the order a plan card lists it; wording is in the translations. */
export const PLAN_FEATURES = ['bookings', 'contracts', 'site', 'checks'] as const

/** What a quoted plan adds; it is described by that rather than by repeating the list above. */
export const ENTERPRISE_FEATURES = ['everything', 'pricing', 'setup'] as const

/** Stripe's statuses for a subscription that is over, so another may be bought. */
export const ENDED_STATUSES: readonly string[] = ['canceled', 'incomplete_expired']

/** How an invoice's standing reads on its badge. */
export const CHARGE_STATUS_TONE: Record<ChargeStatus, Tone> = {
  paid: 'success',
  open: 'warning',
  void: 'neutral',
  uncollectible: 'error',
}

/** How long the worker is given to buy a pack before the balance is read again. */
export const TOP_UP_SETTLE_MS = 5_000

/** The balances auto-recharge can be set to top up below. */
export const RECHARGE_BELOW_OPTIONS: readonly number[] = [5, 10, 20, 50]

/** Where a company asks for an Enterprise quote. Unset, that plan has no contact button. */
export const SALES_EMAIL = import.meta.env.VITE_SALES_EMAIL
