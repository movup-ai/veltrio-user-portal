import { AlertTriangle, CircleSlash, Clock, Info, type LucideIcon } from 'lucide-react'

/** How strongly a state reads, on its badge and its notice strip. */
export type Tone = 'neutral' | 'success' | 'warning' | 'info' | 'error'

export const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-surface-3 text-fg-3',
  success: 'bg-success-tint text-success',
  warning: 'bg-warning-tint text-warning',
  info: 'bg-info-tint text-info',
  error: 'bg-error-tint text-error',
}

export const NOTICE_ICON: Record<Tone, LucideIcon> = {
  neutral: Info,
  success: Info,
  warning: AlertTriangle,
  info: Clock,
  error: CircleSlash,
}
