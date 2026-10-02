import type { PaymentState } from '@/modules/bookings/types/booking.types'
import { normalizeApiError } from '@/services/api/errors'
import type {
  BookingPaymentRecord,
  BookingPayments,
  PaymentLink,
  ReceiptLink,
} from '../types/booking-payment.types'

/** The renter's payment page, on this portal's own origin. */
export function paymentLinkUrl(origin: string, link: Pick<PaymentLink, 'tenantId' | 'token'>): string {
  return `${origin}/pay/${link.tenantId}/${link.token}`
}

/** Numbered from the booking, as the API names its invoice (INV-) and receipt (RCT-). */
export function documentFileName(kind: 'invoice' | 'receipt', reference: string): string {
  return `${kind === 'invoice' ? 'INV' : 'RCT'}-${reference}.pdf`
}

/** The renter's receipt page, on this portal's own origin. */
export function receiptLinkUrl(origin: string, link: ReceiptLink): string {
  return `${origin}/receipt/${link.tenantId}/${link.bookingId}/${link.token}`
}

/** Opens the counter's own email app with the message written; nothing is sent by Veltrio. */
export function emailHref(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body }).toString().replace(/\+/g, '%20')
  return `mailto:${encodeURIComponent(to.trim())}?${params}`
}

/**
 * Opens the counter's messages app. `?&body=` is read by both iOS (which wants `&`) and Android
 * (which wants `?`), so one link works on either.
 */
export function smsHref(to: string, body: string): string {
  const number = to.replace(/[^\d+]/g, '')
  return `sms:${number}?&body=${encodeURIComponent(body)}`
}

/** What is left to give back on a payment; zero for anything that took no money. */
export function refundableAmount(payment: BookingPaymentRecord): number {
  if (payment.status !== 'succeeded' && payment.status !== 'captured') return 0
  return Math.max(0, Math.round((payment.captured - payment.refunded) * 100) / 100)
}

/** The payments a refund can be made on, newest first as they arrive. */
export function refundablePayments(payments: BookingPaymentRecord[]): BookingPaymentRecord[] {
  return payments.filter((payment) => refundableAmount(payment) > 0)
}

export type AmountCheck = { amount: number } | { error: 'invalid' | 'over' }

/** A typed amount, in whole cents, checked against the most it may be. */
export function checkAmount(input: string, max: number): AmountCheck {
  const value = Number(input)
  if (input.trim() === '' || !Number.isFinite(value) || value <= 0) return { error: 'invalid' }
  const amount = Math.round(value * 100) / 100
  if (amount <= 0) return { error: 'invalid' }
  return amount > max ? { error: 'over' } : { amount }
}

/** What a link asks the renter for, which decides how the counter's message words it. */
export type LinkPurpose = 'payment' | 'combined' | 'deposit'

export function linkPurpose(link: Pick<PaymentLink, 'amount' | 'deposit'>): LinkPurpose {
  if (link.amount <= 0) return 'deposit'
  return link.deposit > 0 ? 'combined' : 'payment'
}

export type DepositStatus = 'pending' | 'requested' | 'held' | 'captured' | 'released'

/** Where the deposit stands, for its badge. A new request outranks a hold that lapsed before it. */
export function depositStatus(
  payments: Pick<BookingPayments, 'deposit' | 'depositRequested'>,
): DepositStatus {
  const status = payments.deposit?.status
  if (status === 'held') return status
  if (payments.depositRequested) return 'requested'
  return status === 'captured' || status === 'released' ? status : 'pending'
}

export type PaymentBadge = PaymentState | 'awaiting'

/** The payment card's badge: an unpaid booking with a link out is waiting on the renter, not idle. */
export function paymentBadge(payments: Pick<BookingPayments, 'state' | 'openLink'>): PaymentBadge {
  return payments.state === 'unpaid' && payments.openLink ? 'awaiting' : payments.state
}

/** The rental money that moved, newest first. A link still out is the badge's to show, not a line. */
export function rentalHistory(payments: BookingPaymentRecord[]): BookingPaymentRecord[] {
  return payments.filter(
    (p) => p.kind !== 'deposit' && p.status !== 'canceled' && p.status !== 'requires_payment',
  )
}

/**
 * Whether the renter's link is gone for good: unknown, replaced, or malformed. Anything else,
 * such as Stripe being briefly unreachable, is worth trying again rather than calling it dead.
 */
export function linkIsGone(error: unknown): boolean {
  const { kind } = normalizeApiError(error)
  return kind === 'not_found' || kind === 'validation'
}
