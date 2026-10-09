/** One step of a cancellation policy: this much notice before pickup earns this much back. */
export interface CancellationTier {
  /** Whole 24-hour periods before the pickup time; 0 is any time up to it. */
  daysBefore: number
  refundPercent: number
}

/** Longest notice first. Absent is no stated policy; an empty list is a non-refundable one. */
export type CancellationPolicy = CancellationTier[]

/** Mirrors the limits in the API (app/modules/tenants/cancellation.py). */
export const MAX_CANCELLATION_TIERS = 5
export const MAX_DAYS_BEFORE = 365

export const POLICY_PRESETS = {
  flexible: [{ daysBefore: 1, refundPercent: 100 }],
  standard: [
    { daysBefore: 14, refundPercent: 100 },
    { daysBefore: 7, refundPercent: 50 },
  ],
  nonRefundable: [],
} as const satisfies Record<string, CancellationPolicy>

export const POLICY_CHOICES = ['none', 'flexible', 'standard', 'nonRefundable', 'custom'] as const
export type PolicyChoice = (typeof POLICY_CHOICES)[number]

function sameTiers(a: readonly CancellationTier[], b: readonly CancellationTier[]): boolean {
  return (
    a.length === b.length &&
    a.every((tier, i) => tier.daysBefore === b[i].daysBefore && tier.refundPercent === b[i].refundPercent)
  )
}

/** Which choice a stored policy shows as selected; anything a preset does not match is custom. */
export function policyChoice(policy: CancellationPolicy | undefined): PolicyChoice {
  if (!policy) return 'none'
  const preset = (Object.keys(POLICY_PRESETS) as (keyof typeof POLICY_PRESETS)[]).find((key) =>
    sameTiers(POLICY_PRESETS[key], policy),
  )
  return preset ?? 'custom'
}

export function samePolicy(a: CancellationPolicy | undefined, b: CancellationPolicy | undefined): boolean {
  return a === undefined || b === undefined ? a === b : sameTiers(a, b)
}

export type TierProblem = 'days' | 'percent' | 'daysOrder' | 'percentOrder'

/**
 * What is wrong with each tier, by index, checked here so the API is not asked to refuse it.
 * A tier is compared with the one above it: notice must shorten and the refund must fall.
 */
export function tierProblems(tiers: CancellationTier[]): Record<number, TierProblem> {
  const problems: Record<number, TierProblem> = {}
  const whole = (value: number, min: number, max: number) =>
    Number.isInteger(value) && value >= min && value <= max
  tiers.forEach((tier, i) => {
    const above = tiers[i - 1]
    if (!whole(tier.daysBefore, 0, MAX_DAYS_BEFORE)) problems[i] = 'days'
    else if (!whole(tier.refundPercent, 1, 100)) problems[i] = 'percent'
    else if (above && tier.daysBefore >= above.daysBefore) problems[i] = 'daysOrder'
    else if (above && tier.refundPercent >= above.refundPercent) problems[i] = 'percentOrder'
  })
  return problems
}

/**
 * A tier to add under the last: half its notice for half its refund, which always fits the
 * order the tiers must keep. Undefined when nothing can go below the last one.
 */
export function nextTier(tiers: CancellationTier[]): CancellationTier | undefined {
  const last = tiers.at(-1)
  if (!last) return { daysBefore: 14, refundPercent: 100 }
  if (tiers.length >= MAX_CANCELLATION_TIERS || last.daysBefore < 1 || last.refundPercent < 2)
    return undefined
  return { daysBefore: Math.floor(last.daysBefore / 2), refundPercent: Math.floor(last.refundPercent / 2) }
}

/** A line of the schedule as a renter reads it: a span of notice, and what it gives back. */
export interface PolicyRow {
  /** At least this many days before pickup. */
  from: number
  /** And at most this many; absent on the first line, which has no upper end. */
  to?: number
  refundPercent: number
}

/**
 * The schedule spelled out, including the line the tiers leave unsaid: closer to pickup than
 * the last tier, nothing is refunded. A non-refundable policy is that one line alone.
 */
export function policyRows(policy: CancellationPolicy): PolicyRow[] {
  const rows: PolicyRow[] = policy.map((tier, i) => ({
    from: tier.daysBefore,
    to: i === 0 ? undefined : policy[i - 1].daysBefore - 1,
    refundPercent: tier.refundPercent,
  }))
  const last = policy.at(-1)
  if (!last) return [{ from: 0, refundPercent: 0 }]
  // A last tier of 0 days already runs up to the pickup time, so nothing is left below it.
  if (last.daysBefore > 0) rows.push({ from: 0, to: last.daysBefore - 1, refundPercent: 0 })
  return rows
}
