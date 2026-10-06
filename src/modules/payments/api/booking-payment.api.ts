import { toCents } from '@/lib/money'
import { apiClient } from '@/services/api/client'
import type { BookingPayments, PaymentLink, PublicReceipt, ReceiptLink } from '../types/booking-payment.types'
import {
  toBookingPayments,
  toPaymentLink,
  toPublicReceipt,
  toReceiptLink,
  type BookingPaymentsWire,
  type PaymentLinkWire,
  type PublicReceiptWire,
  type ReceiptLinkWire,
} from './payment.mapper'

const base = (reference: string) => `/bookings/${reference}/payments`

const summary = (request: Promise<{ data: BookingPaymentsWire }>) =>
  request.then((r) => toBookingPayments(r.data))

/** A booking's money: links, holds, manual payments, refunds. Amounts in currency units. */
export const bookingPaymentApi = {
  get: (reference: string): Promise<BookingPayments> =>
    summary(apiClient.get<BookingPaymentsWire>(base(reference))),

  /**
   * The link already out while it asks the same amounts, else a new one; from the day before
   * pickup it asks for the deposit too.
   */
  createLink: (reference: string): Promise<PaymentLink> =>
    apiClient.post<PaymentLinkWire>(`${base(reference)}/link`).then((r) => toPaymentLink(r.data)),

  recordManual: (reference: string, amount: number, method: string): Promise<BookingPayments> =>
    summary(
      apiClient.post<BookingPaymentsWire>(`${base(reference)}/manual`, {
        amountCents: toCents(amount),
        method,
      }),
    ),

  /** A link for the renter to authorise the deposit hold on. */
  requestDeposit: (reference: string): Promise<PaymentLink> =>
    apiClient.post<PaymentLinkWire>(`${base(reference)}/deposit/request`).then((r) => toPaymentLink(r.data)),

  captureDeposit: (reference: string, amount: number): Promise<BookingPayments> =>
    summary(
      apiClient.post<BookingPaymentsWire>(`${base(reference)}/deposit/capture`, {
        amountCents: toCents(amount),
      }),
    ),

  releaseDeposit: (reference: string): Promise<BookingPayments> =>
    summary(apiClient.post<BookingPaymentsWire>(`${base(reference)}/deposit/release`)),

  /** `requestId` stays the same if the same refund is sent again, so it is made only once. */
  refund: (
    reference: string,
    paymentId: string,
    amount: number,
    requestId: string,
  ): Promise<BookingPayments> =>
    summary(
      apiClient.post<BookingPaymentsWire>(`${base(reference)}/refunds`, {
        paymentId,
        amountCents: toCents(amount),
        requestId,
      }),
    ),

  /** The invoice or receipt PDF, made by the API from the booking as it is now. */
  document: (reference: string, kind: 'invoice' | 'receipt'): Promise<Blob> =>
    apiClient.get<Blob>(`${base(reference)}/${kind}`, { responseType: 'blob' }).then((r) => r.data),

  /** The renter's receipt link; the same every time. */
  receiptLink: (reference: string): Promise<ReceiptLink> =>
    apiClient.get<ReceiptLinkWire>(`${base(reference)}/receipt/link`).then((r) => toReceiptLink(r.data)),

  /** The renter's receipt page; needs no login. */
  publicReceipt: ({ tenantId, bookingId, token }: ReceiptLink): Promise<PublicReceipt> =>
    apiClient
      .get<PublicReceiptWire>(`/public/receipts/${tenantId}/${bookingId}/${token}`)
      .then((r) => toPublicReceipt(r.data)),

  /** Opened straight from the renter's page: public, so a plain link downloads it. */
  receiptPdfUrl: ({ tenantId, bookingId, token }: ReceiptLink): string =>
    `${apiClient.defaults.baseURL ?? ''}/public/receipts/${tenantId}/${bookingId}/${token}/pdf`,
}
