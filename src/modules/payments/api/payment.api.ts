import { apiClient } from '@/services/api/client'
import type { CheckoutMethod, CheckoutMethodStatus, PaymentAccount } from '../types/payment-account.types'
import {
  toCheckoutMethods,
  toPaymentAccount,
  type OnboardingLinksWire,
  type OnboardingLinkWire,
  type PaymentAccountWire,
  type PaymentMethodsWire,
} from './payment.mapper'

export const paymentApi = {
  account: (): Promise<PaymentAccount> =>
    apiClient.get<PaymentAccountWire>('/payments/account').then((r) => toPaymentAccount(r.data)),

  /** A single-use link to Stripe's onboarding form; the account is created on first use. */
  onboardingLink: (links: OnboardingLinksWire): Promise<string> =>
    apiClient.post<OnboardingLinkWire>('/payments/account/onboarding', links).then((r) => r.data.url),

  /** Replaces a disconnected account with a new one; answers with the link to set it up. */
  newAccountLink: (links: OnboardingLinksWire): Promise<string> =>
    apiClient.post<OnboardingLinkWire>('/payments/account/new', links).then((r) => r.data.url),

  refreshAccount: (): Promise<PaymentAccount> =>
    apiClient.post<PaymentAccountWire>('/payments/account/refresh').then((r) => toPaymentAccount(r.data)),

  /** What renters can pay with, read live from the company's Stripe settings. */
  methods: (): Promise<CheckoutMethodStatus[]> =>
    apiClient.get<PaymentMethodsWire>('/payments/account/methods').then((r) => toCheckoutMethods(r.data)),

  enableMethod: (method: Exclude<CheckoutMethod, 'card'>): Promise<CheckoutMethodStatus[]> =>
    apiClient
      .post<PaymentMethodsWire>(`/payments/account/methods/${method}/enable`)
      .then((r) => toCheckoutMethods(r.data)),

  /** Unlinks the account; it stays the company's on Stripe. */
  disconnect: (): Promise<PaymentAccount> =>
    apiClient.post<PaymentAccountWire>('/payments/account/disconnect').then((r) => toPaymentAccount(r.data)),

  reconnect: (): Promise<PaymentAccount> =>
    apiClient.post<PaymentAccountWire>('/payments/account/reconnect').then((r) => toPaymentAccount(r.data)),
}
