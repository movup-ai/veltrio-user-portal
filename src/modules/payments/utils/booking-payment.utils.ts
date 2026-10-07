import type { PaymentState } from '@/modules/bookings/types/booking.types'
import { siteUrl } from '@/modules/vehicles/utils/public-links'
import { normalizeApiError } from '@/services/api/errors'
import type {
  BookingPaymentRecord,
  BookingPayments,
  PaymentLink,
  ReceiptLink,
} from '../types/booking-payment.types'

/** The renter's payment page, on the company's own site: the host names the tenant, so the path does not. */
export function paymentLinkUrl(subdomain: string, link: Pick<PaymentLink, 'token'>): string {
  return `${siteUrl(subdomain)}/pay/${link.token}`
}

/** Numbered from the booking, as the API names its invoice (INV-) and receipt (RCT-). */
export function documentFileName(kind: 'invoice' | 'receipt', reference: string): string {
  return `${kind === 'invoice' ? 'INV' : 'RCT'}-${reference}.pdf`
}

/** The renter's receipt page, on the company's own site: the host names the tenant, so the path does not. */
export function receiptLinkUrl(subdomain: string, link: Pick<ReceiptLink, 'bookingId' | 'token'>): string {
  return `${siteUrl(subdomain)}/receipt/${link.bookingId}/${link.token}`
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

/** A return charge as typed: nothing typed is no charge, and `undefined` is not an amount. */
export function parseCharge(input: string): number | undefined {
  if (input.trim() === '') return 0
  const value = Number(input)
  if (!Number.isFinite(value) || value < 0) return undefined
  return Math.round(value * 100) / 100
}

/** The deposit on hold, which is what return charges are captured from; 0 without one. */
export function heldDeposit(payments: Pick<BookingPayments, 'deposit'>): number {
  return payments.deposit?.status === 'held' ? payments.deposit.amount : 0
}

/**
 * What has already gone towards the saved return charges: taken from the deposit, or paid
 * another way since. Settling again must not ask for it twice.
 */
export function collectedForCharges(
  payments: Pick<BookingPayments, 'returnChargesTotal' | 'balance' | 'deposit'>,
): number {
  const taken = payments.deposit?.status === 'captured' ? payments.deposit.captured : 0
  // The larger of the two: a deposit taken beyond the charges does not show in the balance.
  return Math.max(payments.returnChargesTotal - payments.balance, taken, 0)
}

/**
 * How a return's charges fall on a deposit: captured as far as they go, the rest released,
 * and what the deposit cannot cover left to collect. In cents, so 0.1 + 0.2 stays 0.3.
 */
export function settlement(charged: number, deposit: number) {
  const [charges, available] = [Math.round(charged * 100), Math.round(deposit * 100)]
  const capture = Math.min(charges, available)
  return { capture: capture / 100, release: (available - capture) / 100, due: (charges - capture) / 100 }
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

/** A refund as last sent, under the id the API recognises a retry by. */
export interface RefundAttempt {
  paymentId: string
  amount: number
  requestId: string
}

/**
 * The id to send a refund under. The same refund asked again keeps the last one, even after the
 * dialog was closed, since its answer may have been lost on the way back; a different payment or
 * amount is a different refund and gets a new one. Forgotten once a refund succeeds.
 */
export function refundAttempt(
  last: RefundAttempt | undefined,
  paymentId: string,
  amount: number,
  newId: () => string,
): RefundAttempt {
  if (last && last.paymentId === paymentId && last.amount === amount) return last
  return { paymentId, amount, requestId: newId() }
}
