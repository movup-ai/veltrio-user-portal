import { AlertTriangle, CircleSlash, Clock, Info, type LucideIcon } from 'lucide-react'
import type { PaymentAccountState } from '../types/payment-account.types'

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
