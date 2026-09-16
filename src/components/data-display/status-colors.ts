/**
 * Central status→color vocabulary shared by every record table (bookings,
 * vehicles, customers, payments, pricing, locations). Ported 1:1 from the
 * Veltrio Dashboard design spec so the same status string always reads the
 * same color everywhere in the app.
 */
const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  Confirmed: { bg: 'var(--color-tint)', fg: 'var(--color-primary)' },
  'On rent': { bg: 'var(--color-tint)', fg: 'var(--color-primary)' },
  Active: { bg: 'var(--color-success-tint)', fg: 'var(--color-success)' },
  Available: { bg: 'var(--color-success-tint)', fg: 'var(--color-success)' },
  Completed: { bg: 'var(--color-success-tint)', fg: 'var(--color-success)' },
  Paid: { bg: 'var(--color-success-tint)', fg: 'var(--color-success)' },
  Open: { bg: 'var(--color-success-tint)', fg: 'var(--color-success)' },
  'Awaiting ID': { bg: 'var(--color-warning-tint)', fg: 'var(--color-warning)' },
  'Deposit due': { bg: 'var(--color-warning-tint)', fg: 'var(--color-warning)' },
  Maintenance: { bg: 'var(--color-warning-tint)', fg: 'var(--color-warning)' },
  Pending: { bg: 'var(--color-warning-tint)', fg: 'var(--color-warning)' },
  'Verify docs': { bg: 'var(--color-warning-tint)', fg: 'var(--color-warning)' },
  'Limited hours': { bg: 'var(--color-warning-tint)', fg: 'var(--color-warning)' },
  'Overdue fee': { bg: 'var(--color-error-tint)', fg: 'var(--color-error)' },
  'Payment failed': { bg: 'var(--color-error-tint)', fg: 'var(--color-error)' },
  Failed: { bg: 'var(--color-error-tint)', fg: 'var(--color-error)' },
  Flagged: { bg: 'var(--color-error-tint)', fg: 'var(--color-error)' },
  Overdue: { bg: 'var(--color-error-tint)', fg: 'var(--color-error)' },
  Scheduled: { bg: 'var(--color-info-tint)', fg: 'var(--color-info)' },
  New: { bg: 'var(--color-info-tint)', fg: 'var(--color-info)' },
  Refunded: { bg: 'var(--color-neutral-tint)', fg: 'var(--color-fg-2)' },
  'Out of service': { bg: 'var(--color-neutral-tint)', fg: 'var(--color-fg-2)' },
  Dormant: { bg: 'var(--color-neutral-tint)', fg: 'var(--color-fg-2)' },
  Paused: { bg: 'var(--color-neutral-tint)', fg: 'var(--color-fg-2)' },
  Draft: { bg: 'var(--color-neutral-tint)', fg: 'var(--color-fg-2)' },
}

const FALLBACK = { bg: 'var(--color-neutral-tint)', fg: 'var(--color-fg-2)' }

export function statusColors(status: string): { bg: string; fg: string } {
  return STATUS_COLORS[status] ?? FALLBACK
}
