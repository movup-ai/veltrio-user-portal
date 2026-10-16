import { apiClient } from '@/services/api/client'
import { toPaginatedResult, type ListEnvelope } from '@/lib/pagination'
import type { CheckoutMethod, CheckoutMethodStatus, PaymentAccount } from '../types/payment-account.types'
import type { DateRange } from '@/components/ui/date-range-picker'
import type { CollectedDay, PaymentListParams, PaymentStats, Payout } from '../types/payment.types'
import {
  toCheckoutMethods,
  toCollectedDay,
  toPaymentAccount,
  toPaymentListQuery,
  toPaymentRow,
  toPaymentStats,
  toPayout,
  toPeriodQuery,
  type CollectedDayWire,
  type OnboardingLinksWire,
  type OnboardingLinkWire,
  type PaymentAccountWire,
  type PaymentMethodsWire,
  type PaymentRowWire,
  type PaymentStatsWire,
  type PayoutWire,
} from './payment.mapper'

export const paymentApi = {
  /** Every payment across the company's bookings, newest first. Withdrawn links are left out. */
  page: async (params: PaymentListParams) => {
    let requested = params
    let r = await apiClient.get<ListEnvelope<PaymentRowWire>>('/payments', {
      params: toPaymentListQuery(requested),
    })
    let lastPage = Math.max(1, Math.ceil(r.data.total / requested.pageSize))
    // Refetch the clamped page so its rows agree with the pagination metadata.
    while (requested.page > lastPage) {
      requested = { ...requested, page: lastPage }
      r = await apiClient.get<ListEnvelope<PaymentRowWire>>('/payments', {
        params: toPaymentListQuery(requested),
      })
      lastPage = Math.max(1, Math.ceil(r.data.total / requested.pageSize))
    }
    return toPaginatedResult(r.data.items.map(toPaymentRow), r.data.total, requested)
  },

  stats: (): Promise<PaymentStats> =>
    apiClient.get<PaymentStatsWire>('/payments/stats').then((r) => toPaymentStats(r.data)),

  /** Money taken on each company day from `from` to `to` (`YYYY-MM-DD`), both included. */
  collected: (from: string, to: string): Promise<CollectedDay[]> =>
    apiClient
      .get<CollectedDayWire[]>('/payments/collected', { params: { dateFrom: from, dateTo: to } })
      .then((r) => r.data.map(toCollectedDay)),

  /** One payment's own receipt as a PDF: that payment alone, not the booking's invoice. */
  receipt: (paymentId: string): Promise<Blob> =>
    apiClient.get<Blob>(`/payments/${paymentId}/receipt`, { responseType: 'blob' }).then((r) => r.data),

  /** What the listed payments were paid with: `card` for every card, then the rest by name. */
  methodsInUse: (): Promise<string[]> => apiClient.get<string[]>('/payments/methods').then((r) => r.data),

  /** Payouts to the company's bank in the period, read live from its Stripe account. */
  payouts: (period: DateRange): Promise<Payout[]> =>
    apiClient
      .get<PayoutWire[]>('/payments/payouts', { params: toPeriodQuery(period) })
      .then((r) => r.data.map(toPayout)),

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
