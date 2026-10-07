/**
 * Central status→color vocabulary shared by every record table (bookings,
 * vehicles, customers, payments, pricing, locations). Ported 1:1 from the
 * Veltrio Dashboard design spec so the same status string always reads the
 * same color everywhere in the app.
 */
const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  // One hue per booking status, so no two badges in the bookings list read alike.
  Confirmed: { bg: 'var(--color-info-tint)', fg: 'var(--color-info)' },
  // Money reserved rather than taken. Its own key, so it does not follow a booking status's hue.
  Held: { bg: 'var(--color-tint)', fg: 'var(--color-primary)' },
  'On rent': { bg: 'var(--color-tint)', fg: 'var(--color-primary)' },
  Active: { bg: 'var(--color-success-tint)', fg: 'var(--color-success)' },
  Available: { bg: 'var(--color-success-tint)', fg: 'var(--color-success)' },
  Completed: { bg: 'var(--color-success-tint)', fg: 'var(--color-success)' },
  Paid: { bg: 'var(--color-success-tint)', fg: 'var(--color-success)' },
  Open: { bg: 'var(--color-success-tint)', fg: 'var(--color-success)' },
  Ready: { bg: 'var(--color-violet-tint)', fg: 'var(--color-violet)' },
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
  // Filled, not tinted, for the two statuses under which the car is out with a renter.
  Overdue: { bg: 'var(--color-error)', fg: 'var(--color-error-foreground)' },
  'On rental': { bg: 'var(--color-primary)', fg: 'var(--color-primary-foreground)' },
  Returned: { bg: 'var(--color-orange-tint)', fg: 'var(--color-orange)' },
  Cancelled: { bg: 'var(--color-neutral-tint)', fg: 'var(--color-fg-2)' },
  Declined: { bg: 'var(--color-error-tint)', fg: 'var(--color-error)' },
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
