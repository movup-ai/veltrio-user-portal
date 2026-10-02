import type { PaymentState } from '@/modules/bookings/types/booking.types'
import type { VehicleSpecs } from '@/modules/vehicles/api/vehicle.mapper'
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
  captureDeposit: PaymentActionRule
  releaseDeposit: PaymentActionRule
  pickUp: PaymentActionRule
  returnVehicle: PaymentActionRule
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
  balance: number
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
  tenantId: string
  token: string
  /** The rental it charges and the deposit it holds; either may be 0, never both. */
  amount: number
  deposit: number
  currency: string
}

/** One half of the renter's link: the rental payment or the deposit hold. */
export interface PublicPaymentPart<Status extends string> {
  status: Status
  amount: number
  /** Present only while the renter has something to do. */
  clientSecret?: string
}

export type PublicChargeStatus = 'open' | 'processing' | 'paid' | 'closed'
export type PublicDepositStatus = 'open' | 'processing' | 'held' | 'closed'

/** What the renter's payment page shows. */
export interface PublicPayment {
  companyName: string
  reference: string
  renterName: string
  vehicleName: string
  /** The vehicle's cover photo; absent when it has none. */
  vehiclePhotoUrl?: string
  /** Absent once the vehicle is deleted; the name was copied onto the booking. */
  vehicleSpecs?: VehicleSpecs
  pickupAt: string
  returnAt: string
  pickupLocation: string
  currency: string
  /** The booking's deposit, mentioned even on a link that does not ask for it yet. */
  depositAmount: number
  stripeAccountId?: string
  charge?: PublicPaymentPart<PublicChargeStatus>
  deposit?: PublicPaymentPart<PublicDepositStatus>
  /** Once anything is paid: the renter's receipt, a page of its own. */
  receipt?: ReceiptLink
}

/** The pieces of a receipt link; the same every time, derived from the booking. */
export interface ReceiptLink {
  tenantId: string
  bookingId: string
  token: string
}

export interface PublicReceiptPayment {
  /** A captured deposit is money taken too, for damage or fuel. */
  kind: 'rental' | 'deposit'
  method?: string
  amount: number
  refunded: number
  completedAt?: string
}

/** What the renter's receipt page shows. */
export interface PublicReceipt {
  number: string
  companyName: string
  reference: string
  renterName: string
  vehicleName: string
  vehiclePhotoUrl?: string
  vehicleSpecs?: VehicleSpecs
  pickupAt: string
  returnAt: string
  pickupLocation: string
  currency: string
  total: number
  received: number
  balance: number
  payments: PublicReceiptPayment[]
}
