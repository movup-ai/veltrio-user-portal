import { apiClient } from '@/services/api/client'
import type { BookingExtensions, ExtensionQuote } from '../types/booking-extension.types'
import {
  toBookingExtensions,
  toExtensionPayload,
  toExtensionQuote,
  type BookingExtensionsWire,
  type ExtensionQuoteWire,
} from './payment.mapper'

const base = (reference: string) => `/bookings/${reference}/extensions`

const summary = (request: Promise<{ data: BookingExtensionsWire }>) =>
  request.then((r) => toBookingExtensions(r.data))

/** A booking's later return: what it would cost, asking for it, and getting it paid. */
export const bookingExtensionApi = {
  get: (reference: string): Promise<BookingExtensions> =>
    summary(apiClient.get<BookingExtensionsWire>(base(reference))),

  /** Changes nothing; refused when another booking has the vehicle before `returnAt`. */
  quote: (reference: string, returnAt: string): Promise<ExtensionQuote> =>
    apiClient
      .post<ExtensionQuoteWire>(`${base(reference)}/quote`, { returnAt })
      .then((r) => toExtensionQuote(r.data)),

  /** `amount` is the quote's own figure: refused when the price has moved since. */
  request: (reference: string, returnAt: string, amount: number): Promise<BookingExtensions> =>
    summary(apiClient.post<BookingExtensionsWire>(base(reference), toExtensionPayload(returnAt, amount))),

  cancel: (reference: string): Promise<BookingExtensions> =>
    summary(apiClient.post<BookingExtensionsWire>(`${base(reference)}/cancel`)),

  /** Paid outside Stripe, in full, which puts it into effect. */
  recordPaid: (reference: string, method: string): Promise<BookingExtensions> =>
    summary(apiClient.post<BookingExtensionsWire>(`${base(reference)}/manual-payment`, { method })),

  addendum: (reference: string, extensionId: string): Promise<Blob> =>
    apiClient
      .get<Blob>(`${base(reference)}/${extensionId}/addendum`, { responseType: 'blob' })
      .then((r) => r.data),
}
