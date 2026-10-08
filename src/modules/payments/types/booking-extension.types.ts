import type { BookingRateLine } from '@/modules/bookings/types/booking.types'
import type { ExtensionRefusal } from '../constants/payment.constants'
import type { PaymentLink } from './booking-payment.types'

export type ExtensionStatus = 'pending' | 'applied' | 'expired' | 'cancelled'

/** How the renter agreed to the later return: on their payment page, or to a member of staff. */
export type ExtensionConsent = 'link' | 'counter'

/** A later return asked for on a booking. Amounts in currency units. */
export interface BookingExtension {
  id: string
  /** `expired` is read off the clock by the API: a request not paid in time reads so at once. */
  status: ExtensionStatus
  previousReturnAt: string
  newReturnAt: string
  previousTotal: number
  newTotal: number
  /** What the renter pays for it: what the new length adds to the total. */
  amount: number
  /** Until when a request waiting to be paid keeps the extra time from other bookings. */
  expiresAt?: string
  requestedAt: string
  appliedAt?: string
  acceptedAt?: string
  acceptedName?: string
  acceptedMethod?: ExtensionConsent
  /** The renter's link while one is out; absent for a company that does not take cards. */
  link?: PaymentLink
  /** Money can still land on it, even out of time: its link is out, or the bank is deciding. */
  paymentOpen: boolean
  /** Paid for but never in effect, so the renter's to have back. */
  refundDue: number
  /** Whether there is an addendum to open: one the renter agreed to with the car out. */
  hasAddendum: boolean
}

export interface BookingExtensions {
  /** Whether a later return can be asked for now. The API decides, as for the money actions. */
  extend: { allowed: boolean; reason?: ExtensionRefusal }
  /** When the next booking takes the vehicle; absent when nothing follows this one. */
  availableUntil?: string
  pending?: BookingExtension
  /** Every other request, newest first. */
  history: BookingExtension[]
}

/** The rental priced again to a later return. Asking changes nothing. */
export interface ExtensionQuote {
  returnAt: string
  previousTotal: number
  total: number
  amount: number
  /** The rates the whole rental is billed at for its new length, longest unit first. */
  lines: BookingRateLine[]
  /** With the car out, the booking changes only once the amount is paid. */
  payFirst: boolean
}
