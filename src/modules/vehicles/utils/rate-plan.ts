import { fromCents, percentOfCents, toCents } from '@/lib/money'
import {
  DEFAULT_BILLABLE_HOURS_PER_DAY,
  MAX_PREVIEW_ROWS,
  MAX_RENTAL_DAYS,
  PREVIEW_DAYS,
} from '../constants/rate-plan.constants'
import type { BillingBasis, DiscountTier, RateOption } from '../types/vehicle.types'

/**
 * The V1 cost engine: which rates a rental is billed at.
 *
 * 1. An option whose single unit or block is exactly the rental's length wins, undiscounted.
 * 2. Otherwise the cheapest combination of per-unit options that covers the rental. A Daily rate
 *    caps hourly billing at its own price. Without one, each hourly option offers an automatic day
 *    billed as `hoursPerDay` hours, so no day of hourly billing costs more than that.
 * 3. A vehicle with only fixed packages repeats the cheapest one.
 * 4. The discount tier with the highest threshold the rental reaches (in fractional days) comes
 *    off a combination's whole subtotal. Exact matches and packages are never discounted.
 *
 * Ported line for line to the API's `pricing.py`, which re-prices the booking on create; the
 * cases in `rate-plan.test.ts` are asserted with the same numbers in `test_pricing_parity.py`.
 * Money is worked in whole cents so both sides compare and round identically.
 */

const HOURS_PER_UNIT: Record<Exclude<BillingBasis, 'fixed'>, number> = {
  hour: 1,
  day: 24,
  week: 24 * 7,
  month: 24 * 30,
}

const HOURS_PER_DURATION_UNIT = { hours: 1, days: 24, weeks: 24 * 7, months: 24 * 30 } as const

// Durations come from instants, so a whole-hour window can land a hair off an integer.
const EPSILON = 1e-6

export type PlanKind = 'exact' | 'combo' | 'repeat'

export interface RateLine {
  option: RateOption
  count: number
  amount: number
  /** Set on an automatic line: a day of an hourly option, billed as this many hours. */
  cappedHours?: number
}

export interface AppliedDiscount {
  minDays: number
  percentOff: number
  amount: number
}

export interface RatePlan {
  kind: PlanKind
  /** Longest unit first: "Weekly + Daily × 3". */
  lines: RateLine[]
  /** Before the discount. */
  subtotal: number
  discount: AppliedDiscount | null
  /** Across the whole rental; `null` means unlimited. */
  includedMiles: number | null
}

/** Length of one unit, or of one block for a fixed package. */
function optionHours(option: RateOption): number {
  if (option.basis === 'fixed') {
    const unit = option.blockDurationUnit ?? 'days'
    return Math.max(1, option.blockDuration ?? 1) * HOURS_PER_DURATION_UNIT[unit]
  }
  return HOURS_PER_UNIT[option.basis]
}

interface CentsLine {
  option: RateOption
  count: number
  cents: number
  cappedHours?: number
}

interface Piece {
  option: RateOption
  cents: number
  cappedHours?: number
}

/** A day of `hourly` billed as `hoursPerDay` hours. Priced in cents so it matches the API exactly. */
function cappedDay(hourly: RateOption, hoursPerDay: number): Piece {
  const cents = toCents(hourly.rate) * hoursPerDay
  const option: RateOption = {
    ...hourly,
    basis: 'day',
    rate: cents / 100,
    includedMiles: hourly.unlimitedMileage ? undefined : (hourly.includedMiles ?? 0) * hoursPerDay,
  }
  return { option, cents, cappedHours: hoursPerDay }
}

/** Least total cost whose units add up to at least `hours`; earlier pieces win ties. */
function cheapestCover(pieces: Piece[], hours: number): CentsLine[] {
  const target = Math.max(1, Math.ceil(hours - EPSILON))
  const lengths = pieces.map((p) => optionHours(p.option))
  const best = [0, ...Array<number>(target).fill(Infinity)]
  const choice = Array<number>(target + 1).fill(-1)
  for (let h = 1; h <= target; h++) {
    pieces.forEach((piece, i) => {
      const cost = piece.cents + best[Math.max(0, h - lengths[i])]
      if (cost < best[h]) {
        best[h] = cost
        choice[h] = i
      }
    })
  }

  const counts = pieces.map(() => 0)
  for (let h = target; h > 0; h = Math.max(0, h - lengths[choice[h]])) counts[choice[h]] += 1
  return pieces
    .map((piece, i) => ({
      option: piece.option,
      count: counts[i],
      cents: piece.cents * counts[i],
      cappedHours: piece.cappedHours,
      index: i,
    }))
    .filter((line) => line.count > 0)
    .sort((a, b) => lengths[b.index] - lengths[a.index] || a.index - b.index)
    .map(({ index: _index, ...line }) => line)
}

function cheapestRepeat(options: RateOption[], hours: number): CentsLine {
  const lines = options.map((option) => {
    const count = Math.max(1, Math.ceil(hours / optionHours(option) - EPSILON))
    return { option, count, cents: toCents(option.rate) * count }
  })
  return lines.reduce((best, line) => (line.cents < best.cents ? line : best))
}

function discountFor(tiers: DiscountTier[], hours: number, subtotalCents: number): AppliedDiscount | null {
  const days = hours / 24
  const reached = tiers.filter((t) => days + EPSILON >= t.minDays)
  if (reached.length === 0) return null
  const tier = reached.reduce((best, t) => (t.minDays > best.minDays ? t : best))
  const cents = percentOfCents(subtotalCents, tier.percentOff)
  return { minDays: tier.minDays, percentOff: tier.percentOff, amount: fromCents(cents) }
}

function includedMiles(lines: CentsLine[]): number | null {
  // One unlimited piece makes the whole rental unlimited.
  if (lines.some((line) => line.option.unlimitedMileage)) return null
  return lines.reduce((sum, line) => sum + (line.option.includedMiles ?? 0) * line.count, 0)
}

/** The rates a rental of `hours` is billed at; null with no options, or past MAX_RENTAL_DAYS. */
export function planRental(
  options: RateOption[],
  tiers: DiscountTier[],
  hours: number,
  hoursPerDay: number = DEFAULT_BILLABLE_HOURS_PER_DAY,
): RatePlan | null {
  if (hours > MAX_RENTAL_DAYS * 24 + EPSILON) return null
  const exact = options.filter((o) => Math.abs(optionHours(o) - hours) < EPSILON)
  const perUnit = options.filter((o) => o.basis !== 'fixed')

  let kind: PlanKind
  let lines: CentsLine[]
  if (exact.length > 0) {
    const cheapest = exact.reduce((best, o) => (toCents(o.rate) < toCents(best.rate) ? o : best))
    kind = 'exact'
    lines = [{ option: cheapest, count: 1, cents: toCents(cheapest.rate) }]
  } else if (perUnit.length > 0) {
    kind = 'combo'
    const pieces: Piece[] = perUnit.map((option) => ({ option, cents: toCents(option.rate) }))
    if (hoursPerDay < 24 && hourlyCapApplies(perUnit)) {
      pieces.push(...perUnit.filter((o) => o.basis === 'hour').map((o) => cappedDay(o, hoursPerDay)))
    }
    lines = cheapestCover(pieces, hours)
  } else if (options.length > 0) {
    kind = 'repeat'
    lines = [cheapestRepeat(options, hours)]
  } else {
    return null
  }

  const subtotalCents = lines.reduce((sum, line) => sum + line.cents, 0)
  return {
    kind,
    lines: lines.map(({ option, count, cents, cappedHours }) => ({
      option,
      count,
      amount: cents / 100,
      ...(cappedHours ? { cappedHours } : {}),
    })),
    subtotal: subtotalCents / 100,
    discount: kind === 'combo' ? discountFor(tiers, hours, subtotalCents) : null,
    includedMiles: includedMiles(lines),
  }
}

/** Whole-day trip lengths the effective-rates preview prices, shortest first. */
export function previewDays(options: RateOption[], tiers: DiscountTier[]): number[] {
  const exactDays = options
    .map(optionHours)
    .filter((h) => h % 24 === 0)
    .map((h) => h / 24)
  // Every tier threshold first: a discount the operator set must be checkable here, and there are
  // never more tiers than rows. The other lengths fill what is left, shortest first.
  const days = new Set<number>(tiers.map((t) => t.minDays))
  for (const day of [...PREVIEW_DAYS, ...exactDays].sort((a, b) => a - b)) {
    if (days.size >= MAX_PREVIEW_ROWS) break
    days.add(day)
  }
  // Nothing past the longest rental: the engine will not price it.
  return [...days].filter((d) => d <= MAX_RENTAL_DAYS).sort((a, b) => a - b)
}

/**
 * Whether the automatic daily cap applies: there is an hourly rate to cap and no Daily rate. A
 * Daily rate is the operator's own price for a day, so the cap must never undercut it.
 */
export function hourlyCapApplies(options: Pick<RateOption, 'basis'>[]): boolean {
  return options.some((o) => o.basis === 'hour') && !options.some((o) => o.basis === 'day')
}

/** True when the engine priced part of the rental itself: a capped hourly day or a repeated package. */
export function isAutomatic(plan: RatePlan): boolean {
  return plan.kind === 'repeat' || plan.lines.some((line) => line.cappedHours)
}

/** What the renter pays for the rental itself, after any discount. */
export function planTotal(plan: RatePlan): number {
  return (toCents(plan.subtotal) - toCents(plan.discount?.amount ?? 0)) / 100
}
