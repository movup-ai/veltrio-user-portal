import type { PaymentAccount, PaymentAccountState } from '../types/payment-account.types'

/** Where the payments settings live; Stripe sends the owner back here. */
export const PAYMENT_SETTINGS_PATH = '/settings/payments'

/** What the owner can do next, from Stripe's statuses. Requirements outrank capabilities:
 *  while Stripe is waiting on the owner, "in review" would tell them there is nothing to do. */
export function accountState(account: PaymentAccount): PaymentAccountState {
  if (!account.available) return 'unavailable'
  if (account.disconnected) return 'disconnected'
  if (!account.connected) return 'notConnected'
  // Either one turned down ends it: an account that cannot pay out cannot take bookings either.
  if ([account.cardPayments, account.payouts].some((s) => s === 'rejected' || s === 'unsupported'))
    return 'rejected'
  if (account.requirements === 'currently_due' || account.requirements === 'past_due') return 'needsInfo'
  if (account.cardPayments === 'active' && account.payouts === 'active') return 'active'
  return 'inReview'
}

/** The return and expired-link URLs for Stripe's form, on this portal's own origin. */
export function onboardingLinks(origin: string) {
  return {
    returnUrl: `${origin}${PAYMENT_SETTINGS_PATH}?stripe=return`,
    refreshUrl: `${origin}${PAYMENT_SETTINGS_PATH}?stripe=refresh`,
  }
}
