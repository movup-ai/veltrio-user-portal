/**
 * The company's Stripe account as the API last synced it. Statuses are Stripe's own values,
 * passed through: a capability is `active | pending | restricted | rejected | unsupported`.
 */
export interface PaymentAccount {
  /** False when the API has no Stripe key, so nothing can be connected yet. */
  available: boolean
  connected: boolean
  /** An account exists but the owner unlinked it; reconnecting restores the same one. */
  disconnected: boolean
  cardPayments?: string
  payouts?: string
  /** The most urgent outstanding requirement: `currently_due | eventually_due | past_due`. */
  requirements?: string
  /** ISO 4217, from the account itself: what renters are charged and payouts arrive in. */
  currency?: string
  connectedAt?: string
}

export type PaymentAccountState =
  'unavailable' | 'disconnected' | 'notConnected' | 'needsInfo' | 'inReview' | 'active' | 'rejected'

/** What renters can pay with. The wallets ride on card payments; each is switched on or off in
 *  the company's Stripe payment method settings. */
export type CheckoutMethod = 'card' | 'apple_pay' | 'google_pay' | 'link'

export interface CheckoutMethodStatus {
  type: CheckoutMethod
  /** On in the settings checkout uses, and backed by an active capability. */
  available: boolean
}
