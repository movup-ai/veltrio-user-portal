import type {
  Billing,
  BillingInterval,
  BillingState,
  CreditPack,
  Credits,
  PlanLimit,
  PlanOffer,
} from '../types/billing.types'
import { normalizeApiError } from '@/services/api/errors'
import { ENDED_STATUSES } from '../constants/billing.constants'

/** Where the billing settings live; Stripe sends the owner back here. */
export const BILLING_SETTINGS_PATH = '/settings/billing'

/** What Stripe's pages put on the way back, so the subscription is read from Stripe again. */
export const SUBSCRIPTION_RETURN_PARAMS = ['checkout', 'portal'] as const

/** Where Stripe's customer portal sends the owner back: a card or a cancellation may have changed. */
export function portalReturnUrl(origin: string): string {
  return `${origin}${BILLING_SETTINGS_PATH}?portal=done`
}

/** The return URLs for Stripe's checkout, on this portal's own origin. */
export function checkoutLinks(origin: string) {
  return {
    successUrl: `${origin}${BILLING_SETTINGS_PATH}?checkout=done`,
    cancelUrl: `${origin}${BILLING_SETTINGS_PATH}`,
  }
}

/** Where Stripe sends the owner after buying a pack; it fills in the checkout's own id. */
export const PACK_CHECKOUT_PARAM = 'credits'

/** The return URLs for a credit pack's checkout. The braces are Stripe's placeholder, kept raw. */
export function packCheckoutLinks(origin: string) {
  return {
    successUrl: `${origin}${BILLING_SETTINGS_PATH}?${PACK_CHECKOUT_PARAM}={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}${BILLING_SETTINGS_PATH}`,
  }
}

export function pricePerCredit(pack: CreditPack): number {
  return pack.price / pack.credits
}

/** How the balance reads: `empty` cannot pay for the cheapest check, `low` is under the line. */
export function creditLevel(credits: Credits): 'empty' | 'low' | 'ok' {
  const cheapest = Math.min(...Object.values(credits.costs))
  if (credits.balance < cheapest) return 'empty'
  // With auto-recharge on, a low balance is about to be topped up, so it is not a warning.
  if (credits.balance < credits.lowBalance && !credits.autoRecharge) return 'low'
  return 'ok'
}

/** What to tell the company about its subscription. Ending outranks the status it ends from:
 *  a trial the owner cancelled is still `trialing` to Stripe, but what matters is that it stops. */
export function billingState(billing: Billing): BillingState {
  if (!billing.enabled) return 'off'
  if (!billing.plan || !billing.status) return 'none'
  // Not running but not over either: Stripe still holds it, so a second one cannot be bought.
  if (!billing.active) return ENDED_STATUSES.includes(billing.status) ? 'ended' : 'onHold'
  if (billing.cancelAtPeriodEnd) return 'ending'
  if (billing.status === 'trialing') return 'trialing'
  if (billing.status === 'past_due') return 'pastDue'
  return 'active'
}

export function planPrice(offer: PlanOffer, interval: BillingInterval): number | undefined {
  return interval === 'month' ? offer.monthly : offer.yearly
}

/** What choosing a plan would be, for a company that already has one. */
export type PlanMove = 'current' | 'upgrade' | 'downgrade' | 'period'

/**
 * Plans are offered smallest first, so position says which way a change goes. The same plan
 * on the other billing period is neither up nor down: it is a change of period.
 */
export function planMove(billing: Billing, offer: PlanOffer, period: BillingInterval): PlanMove {
  const from = billing.plans.findIndex((plan) => plan.plan === billing.plan)
  const to = billing.plans.findIndex((plan) => plan.plan === offer.plan)
  if (to > from) return 'upgrade'
  if (to < from) return 'downgrade'
  return billing.interval === period ? 'current' : 'period'
}

/**
 * The limit adding `adding` vehicles, or a branch, would cross. Undefined where nothing stops
 * it, including before the plan is known: the API's own refusal answers then.
 */
export function planLimitFor(
  billing: Billing | undefined,
  what: 'vehicles' | 'branches',
  adding = 1,
): PlanLimit | undefined {
  if (!billing?.enabled) return undefined
  if (!billing.active) return 'noPlan'
  const [used, limit] =
    what === 'vehicles' ? [billing.vehicles, billing.maxVehicles] : [billing.branches, billing.maxBranches]
  return limit !== undefined && used + adding > limit ? what : undefined
}

const PLAN_LIMIT_CODES: Record<string, PlanLimit> = {
  subscription_required: 'noPlan',
  vehicle_limit_reached: 'vehicles',
  branch_limit_reached: 'branches',
}

/** The plan limit an API refusal is about, if that is what it is. */
export function planLimitFromError(error: unknown): PlanLimit | undefined {
  const { code } = normalizeApiError(error)
  return code ? PLAN_LIMIT_CODES[code] : undefined
}

/** A plan Veltrio quotes and sets up by hand, so it has no price to buy it at. */
export function isQuoted(offer: PlanOffer): boolean {
  return offer.monthly === undefined
}

/** Which of the fleet's sizes a plan is too small for; the API refuses such a plan. */
export function planShortfall(
  offer: PlanOffer,
  usage: Pick<Billing, 'vehicles' | 'branches'>,
): 'vehicles' | 'branches' | undefined {
  if (offer.maxVehicles !== undefined && usage.vehicles > offer.maxVehicles) return 'vehicles'
  if (offer.maxBranches !== undefined && usage.branches > offer.maxBranches) return 'branches'
  return undefined
}

/** Which banner the whole portal shows, if any. A failed payment is the owner's to fix, so
 *  nobody else is told; no running plan stops everyone's work, so everyone is. */
export function bannerFor(billing: Billing, isOwner: boolean): 'owner' | 'other' | 'pastDue' | undefined {
  const state = billingState(billing)
  if (state === 'none' || state === 'ended') return isOwner ? 'owner' : 'other'
  // On hold stops everyone's work as well, but the owner's way out is the card, not a plan.
  if (state === 'onHold') return isOwner ? 'pastDue' : 'other'
  if (state === 'pastDue' && isOwner) return 'pastDue'
  return undefined
}

/** Whether saving this auto-recharge would buy its pack straight away. */
export function rechargesNow(balance: number, below: number): boolean {
  return balance < below
}

/** Whether a subscription is running, so choosing a plan changes it rather than starting one. */
export function isSubscribed(billing: Billing): boolean {
  const state = billingState(billing)
  return state === 'trialing' || state === 'active' || state === 'pastDue' || state === 'ending'
}
