import type { PaymentState } from '@/modules/bookings/types/booking.types'
import type { PaymentRefusal } from '../constants/payment.constants'

export type BookingPaymentKind = 'charge' | 'deposit' | 'manual'

export type BookingPaymentStatus =
  'requires_payment' | 'processing' | 'succeeded' | 'held' | 'captured' | 'released' | 'failed' | 'canceled'

/** One charge, deposit hold or manual payment on a booking. Amounts in currency units. */
export interface BookingPaymentRecord {
  id: string
  kind: BookingPaymentKind
  status: BookingPaymentStatus
  amount: number
  captured: number
  refunded: number
  currency: string
  /** "Visa ·· 4242", or what the counter wrote for cash. */
  method?: string
  failureMessage?: string
  /** When a held deposit lapses unless captured. */
  captureBefore?: string
  completedAt?: string
  createdAt: string
}

/** What a return charge is for. One line of each at most; `other` takes the rest. */
export const RETURN_CHARGE_KINDS = ['over_mileage', 'fuel', 'damage', 'late_return', 'other'] as const
export type ReturnChargeKind = (typeof RETURN_CHARGE_KINDS)[number]

/** One thing the return cost beyond the quote, as the counter priced it. */
export interface ReturnCharge {
  kind: ReturnChargeKind
  amount: number
  note?: string
}

/** Whether the counter can do something now, and if not, why. */
export interface PaymentActionRule {
  allowed: boolean
  reason?: PaymentRefusal
}

/** What the counter can do next. The API decides, so every screen shows the same rules. */
export interface PaymentActions {
  sendLink: PaymentActionRule
  /** The link asks for the deposit too: from the day before pickup, while none is held. */
  linkIncludesDeposit: boolean
  markPaid: PaymentActionRule
  requestDeposit: PaymentActionRule
  releaseDeposit: PaymentActionRule
  /** Listing what the return cost: once the vehicle is back, until the booking is closed. */
  setReturnCharges: PaymentActionRule
  pickUp: PaymentActionRule
  returnVehicle: PaymentActionRule
  /** Closing off after return: waits for the deposit, and for charges it did not cover. */
  close: PaymentActionRule
}

/** Where a booking's money stands. */
export interface BookingPayments {
  /** False until the company's Stripe account takes cards: no links. */
  available: boolean
  state: PaymentState
  currency: string
  total: number
  /** Taken for the rental; a captured deposit is not counted here. */
  paid: number
  refunded: number
  /** Still to collect: the rental, and after the return any charges the deposit did not cover. */
  balance: number
  returnCharges: ReturnCharge[]
  returnChargesTotal: number
  depositAmount: number
  /** The latest deposit held or settled; absent until the renter authorises one. */
  deposit?: BookingPaymentRecord
  openLink: boolean
  /** A deposit link is out, waiting for the renter. */
  depositRequested: boolean
  actions: PaymentActions
  payments: BookingPaymentRecord[]
}

/** The pieces of a payment link; the API hands the same one back while nothing changes. */
export interface PaymentLink {
  token: string
  /** The rental it charges and the deposit it holds; either may be 0, never both. */
  amount: number
  deposit: number
  currency: string
}

/** The pieces of a receipt link; the same every time, derived from the booking. */
export interface ReceiptLink {
  bookingId: string
  token: string
}
