import { FileCheck2, ShieldCheck, type LucideIcon } from 'lucide-react'
import type { ProviderKind } from '../types/booking.types'
import type { VerificationTone } from '../utils/booking.verification'

/** The checks the verification page offers, in the order it lists them. */
export const STANDALONE_CHECKS = [
  { kind: 'background', icon: ShieldCheck },
  { kind: 'insurance', icon: FileCheck2 },
] as const satisfies readonly { kind: ProviderKind; icon: LucideIcon }[]

export type StandaloneCheck = (typeof STANDALONE_CHECKS)[number]['kind']

/** How often to re-ask while a provider is still working — the same shape as the photo poll. */
export const VERIFICATION_POLL_MS = 15_000

/** Long enough for the new tab to have loaded a report's blob before its URL is released. */
export const REVOKE_AFTER_MS = 60_000

/** The status label beside a check, on the checklist tile and the booking-form card alike. */
export const TONE_LABEL: Record<VerificationTone, string> = {
  success: 'text-success',
  error: 'text-error',
  pending: 'text-warning',
  neutral: 'text-fg-4',
}

/** The checklist tile's status dot. */
export const TONE_DOT: Record<VerificationTone, string> = {
  success: 'bg-success text-white',
  error: 'bg-error-tint',
  pending: 'bg-warning-tint',
  neutral: 'bg-neutral-tint',
}

/** The booking-form card's frame. */
export const TONE_RING: Record<VerificationTone, string> = {
  success: 'border-success/40 bg-success-tint/30',
  error: 'border-error/40 bg-error-tint/30',
  pending: 'border-warning/40 bg-warning-tint/30',
  neutral: 'border-border',
}

/** The booking-form card's icon tile. */
export const TONE_ICON: Record<VerificationTone, string> = {
  success: 'bg-success text-white',
  error: 'bg-error text-white',
  pending: 'bg-warning-tint text-warning',
  neutral: 'bg-surface-3 text-fg-4',
}
