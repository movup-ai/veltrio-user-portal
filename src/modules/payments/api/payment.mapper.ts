import type { CheckoutMethod, CheckoutMethodStatus, PaymentAccount } from '../types/payment-account.types'

export interface PaymentAccountWire {
  available: boolean
  connected: boolean
  disconnected: boolean
  cardPayments: string | null
  payouts: string | null
  requirements: string | null
  currency: string | null
  connectedAt: string | null
}

export interface PaymentMethodsWire {
  methods: { type: string; available: boolean }[]
}

export interface OnboardingLinksWire {
  returnUrl: string
  refreshUrl: string
}

export interface OnboardingLinkWire {
  url: string
}

export function toPaymentAccount(wire: PaymentAccountWire): PaymentAccount {
  return {
    available: wire.available,
    connected: wire.connected,
    disconnected: wire.disconnected,
    cardPayments: wire.cardPayments ?? undefined,
    payouts: wire.payouts ?? undefined,
    requirements: wire.requirements ?? undefined,
    currency: wire.currency ?? undefined,
    connectedAt: wire.connectedAt ?? undefined,
  }
}

const CHECKOUT_METHODS: readonly CheckoutMethod[] = ['card', 'apple_pay', 'google_pay', 'link']

/** Methods the portal has no name for are dropped rather than shown as raw slugs. */
export function toCheckoutMethods(wire: PaymentMethodsWire): CheckoutMethodStatus[] {
  return wire.methods.flatMap((m) =>
    (CHECKOUT_METHODS as readonly string[]).includes(m.type)
      ? [{ type: m.type as CheckoutMethod, available: m.available }]
      : [],
  )
}
