import type { DateRange } from '@/components/ui/date-range-picker'
import type { BookingPaymentKind } from './booking-payment.types'

/** Where a payment stands. `failed` is a link still open whose last attempt the card declined. */
export const PAYMENT_STATES = [
  'paid',
  'pending',
  'failed',
  'held',
  'released',
  'refunded',
  'partly_refunded',
] as const
export type PaymentRowState = (typeof PAYMENT_STATES)[number]

/** The method filter's value for any card: each card's own label is different. */
export const CARD_METHOD = 'card'

/** One payment as the payments page lists it. Amounts in currency units. */
export interface PaymentRow {
  id: string
  kind: BookingPaymentKind
  state: PaymentRowState
  /** What was taken; while nothing has been, what is asked for or held. */
  amount: number
  refunded: number
  currency: string
  /** "Visa ·· 4242", or what the counter wrote for cash. Absent on a link nobody has paid. */
  method?: string
  /** When the money moved, or when it was asked for if it has not. */
  at: string
  bookingReference: string
  customerName: string
}

/** 'All' sends no tab. Refunded also covers a payment only partly refunded. */
export const PAYMENT_TABS = ['All', 'Paid', 'Pending', 'Failed', 'Refunded'] as const
export type PaymentTab = (typeof PAYMENT_TABS)[number]

export interface PaymentFilters {
  search: string
  tab: PaymentTab
  state: PaymentRowState | 'Any'
  /** `CARD_METHOD`, or a method exactly as it is written on the payment. */
  method: string
  /** The days the money moved on, by the company's own clock. */
  period: DateRange
}

export interface PaymentListParams extends PaymentFilters {
  page: number
  pageSize: number
}

/** Stripe's payout statuses this portal has words for; any other is shown as Stripe spells it. */
export const PAYOUT_STATUSES = ['paid', 'pending', 'in_transit', 'canceled', 'failed'] as const

/** Money Stripe sent, or is sending, from the company's balance to its bank. */
export interface Payout {
  id: string
  status: string
  amount: number
  currency: string
  /** `YYYY-MM-DD`: the day it reaches the bank. */
  arrivalDate: string
  /** "Chase ·· 8821". Absent when Stripe does not say where it went. */
  destination?: string
  failureMessage?: string
}

/** The stat cards. Unaffected by the search and tab: they describe the business, not the view. */
export interface PaymentStats {
  /** Taken this calendar month, less what was refunded of it. */
  collected: number
  refunded: number
  /** What accepted bookings not yet closed still owe. */
  outstanding: number
  outstandingBookings: number
  failed: number
  held: number
  heldCount: number
}
