import { AlertTriangle, CircleSlash, Clock, Info, type LucideIcon } from 'lucide-react'
import type { PaymentAccountState } from '../types/payment-account.types'
import type { DepositStatus, PaymentBadge } from '../utils/booking-payment.utils'

/** Standard accounts sign in to Stripe's own Dashboard with their own login. */
export const STRIPE_DASHBOARD_URL = 'https://dashboard.stripe.com'

/** How strongly an account state reads, on its badge and its notice strip. */
export type PaymentTone = 'neutral' | 'success' | 'warning' | 'info' | 'error'

export const TONE_CLASS: Record<PaymentTone, string> = {
  neutral: 'bg-surface-3 text-fg-3',
  success: 'bg-success-tint text-success',
  warning: 'bg-warning-tint text-warning',
  info: 'bg-info-tint text-info',
  error: 'bg-error-tint text-error',
}

export const STATE_TONE: Record<PaymentAccountState, PaymentTone> = {
  unavailable: 'neutral',
  disconnected: 'neutral',
  notConnected: 'neutral',
  needsInfo: 'warning',
  inReview: 'info',
  active: 'success',
  rejected: 'error',
}

export const NOTICE_ICON: Record<PaymentTone, LucideIcon> = {
  neutral: Info,
  success: Info,
  warning: AlertTriangle,
  info: Clock,
  error: CircleSlash,
}

/** Stripe capability statuses by how good they are; anything newer reads as neutral. */
export const CAPABILITY_DOT: Record<string, string> = {
  active: 'bg-success',
  pending: 'bg-warning',
  restricted: 'bg-warning',
  rejected: 'bg-error',
  unsupported: 'bg-error',
}

/** How the counter can say money reached them outside Stripe; labels live in the translations. */
export const MANUAL_METHODS = [
  'cash',
  'cardTerminal',
  'bankTransfer',
  'zelle',
  'venmo',
  'cashApp',
  'check',
  'other',
] as const

export type ManualMethod = (typeof MANUAL_METHODS)[number]

/** Mirrors the note length on ReturnCharge in the API (app/modules/payments/schemas.py). */
export const RETURN_CHARGE_NOTE_MAX = 300

/** Why the API turns a booking's money or handover action down; hints live in the translations. */
export const PAYMENT_REFUSALS = [
  'payments_not_ready',
  'booking_cancelled',
  'nothing_to_collect',
  'no_deposit',
  'deposit_already_held',
  'booking_returned',
  'no_deposit_held',
  'not_returned',
  'not_before_pickup',
  'not_fully_paid',
  'contract_unsigned',
  'not_on_rental',
  'not_confirmed',
  'not_awaiting_close',
  'deposit_unsettled',
  'charges_unpaid',
  'booking_closed',
] as const

export type PaymentRefusal = (typeof PAYMENT_REFUSALS)[number]

/** Why the API will not take a request to extend; hints live in the translations. */
export const EXTENSION_REFUSALS = [
  'not_confirmed',
  'booking_cancelled',
  'booking_returned',
  'vehicle_removed',
  'extension_pending',
] as const

export type ExtensionRefusal = (typeof EXTENSION_REFUSALS)[number]

/** What the API answers a quote or a request it turns down with, where the dialog has words for it. */
export const EXTENSION_ERRORS = [
  ...EXTENSION_REFUSALS,
  'vehicle_unavailable',
  'return_not_later',
  'return_in_past',
  'rental_too_long',
  'vehicle_has_no_rates',
  'quote_changed',
  'extension_paid',
] as const

export type ExtensionError = (typeof EXTENSION_ERRORS)[number]

/**
 * The payment badge's colour, as a shared status-colour key: amber while nothing is taken, teal
 * once the rental or the deposit is, green when both are.
 */
export const PAYMENT_STATE_BADGE: Record<PaymentBadge, string> = {
  unpaid: 'Pending',
  awaiting: 'Scheduled',
  deposit_held: 'Held',
  rental_paid: 'Held',
  paid: 'Paid',
  refunded: 'Refunded',
}

/**
 * The deposit badge's colour, as a shared status-colour key. A hold is reserved, not taken,
 * so it is teal with a lock rather than the green of money received.
 */
export const DEPOSIT_STATUS_BADGE: Record<DepositStatus, string> = {
  pending: 'Pending',
  requested: 'Scheduled',
  held: 'Held',
  captured: 'Paid',
  released: 'Refunded',
}
