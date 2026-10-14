import { apiClient } from '@/services/api/client'
import type { AutoRecharge, Billing, BillingHistory, PlanChoice } from '../types/billing.types'
import {
  toAutoRechargeWire,
  toBilling,
  toBillingHistory,
  type BillingHistoryWire,
  type BillingWire,
  type CheckoutWire,
  type LinkWire,
  type PackCheckoutWire,
} from './billing.mapper'

export const billingApi = {
  get: (): Promise<Billing> => apiClient.get<BillingWire>('/billing').then((r) => toBilling(r.data)),

  /** A link to Stripe's checkout for a plan; the company's customer is created on first use. */
  checkoutLink: (checkout: CheckoutWire): Promise<string> =>
    apiClient.post<LinkWire>('/billing/checkout', checkout).then((r) => r.data.url),

  /** A link to Stripe's customer portal: the card, the invoices and cancelling. */
  portalLink: (returnUrl: string): Promise<string> =>
    apiClient.post<LinkWire>('/billing/portal', { returnUrl }).then((r) => r.data.url),

  changePlan: (choice: PlanChoice): Promise<Billing> =>
    apiClient.post<BillingWire>('/billing/plan', choice).then((r) => toBilling(r.data)),

  refresh: (): Promise<Billing> =>
    apiClient.post<BillingWire>('/billing/refresh').then((r) => toBilling(r.data)),

  /** A link to Stripe's checkout for one credit pack. */
  packCheckoutLink: (checkout: PackCheckoutWire): Promise<string> =>
    apiClient.post<LinkWire>('/billing/credits/checkout', checkout).then((r) => r.data.url),

  /** Adds a paid checkout's credits; safe to call for one already counted. */
  confirmPack: (checkoutId: string): Promise<Billing> =>
    apiClient.post<BillingWire>('/billing/credits/confirm', { checkoutId }).then((r) => toBilling(r.data)),

  /** `undefined` switches auto-recharge off. */
  setAutoRecharge: (setting: AutoRecharge | undefined): Promise<Billing> =>
    apiClient
      .put<BillingWire>('/billing/credits/auto-recharge', toAutoRechargeWire(setting))
      .then((r) => toBilling(r.data)),

  /** What the company has been charged, newest first. Owner only. */
  history: (): Promise<BillingHistory> =>
    apiClient.get<BillingHistoryWire>('/billing/history').then((r) => toBillingHistory(r.data)),
}
