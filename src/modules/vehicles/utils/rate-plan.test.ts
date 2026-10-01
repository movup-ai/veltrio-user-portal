import { describe, expect, it } from 'vitest'
import type { DiscountTier, RateOption } from '../types/vehicle.types'
import { planRental, planTotal, previewDays, type RatePlan } from './rate-plan'

// Every case here is asserted with the same numbers in the API's test_pricing_parity.py.

function option(overrides: Partial<RateOption>): RateOption {
  return {
    id: 'o',
    label: 'Daily',
    basis: 'day',
    rate: 55,
    includedMiles: 200,
    unlimitedMileage: false,
    ...overrides,
  }
}

// The rate card from the spec: Daily $400, Weekly $2,200, a 3-day Weekend Package at $1,500,
// with 10% off 3+ days and 15% off 7+ days.
const DAILY = option({ id: 'daily', label: 'Daily', rate: 400, includedMiles: 200 })
const WEEKLY = option({ id: 'weekly', label: 'Weekly', basis: 'week', rate: 2200, includedMiles: 1500 })
const WEEKEND = option({
  id: 'weekend',
  label: 'Weekend Package',
  basis: 'fixed',
  rate: 1500,
  blockDuration: 3,
  blockDurationUnit: 'days',
  includedMiles: undefined,
  unlimitedMileage: true,
})
const SPEC_CARD = [DAILY, WEEKLY, WEEKEND]
const SPEC_TIERS: DiscountTier[] = [
  { minDays: 3, percentOff: 10 },
  { minDays: 7, percentOff: 15 },
]

function summary(plan: RatePlan | null) {
  expect(plan).not.toBeNull()
  return {
    kind: plan!.kind,
    lines: plan!.lines.map((l) => [l.option.label, l.count]),
    subtotal: plan!.subtotal,
    discount: plan!.discount?.amount ?? 0,
  }
}

describe('the spec’s effective-rates preview', () => {
  it.each([
    [1, 'exact', [['Daily', 1]], 400, 0],
    // Daily × 3 less 10% would be $1,080, but the package's exact length wins.
    [3, 'exact', [['Weekend Package', 1]], 1500, 0],
    [4, 'combo', [['Daily', 4]], 1600, 160],
    // An exact match is never discounted, even though 7+ days would earn 15%.
    [7, 'exact', [['Weekly', 1]], 2200, 0],
    [
      10,
      'combo',
      [
        ['Weekly', 1],
        ['Daily', 3],
      ],
      3400,
      510,
    ],
    [14, 'combo', [['Weekly', 2]], 4400, 660],
  ])('prices %i days', (days, kind, lines, subtotal, discount) => {
    expect(summary(planRental(SPEC_CARD, SPEC_TIERS, days * 24))).toEqual({ kind, lines, subtotal, discount })
  })

  it('nets the 10-day row to $2,890', () => {
    expect(planTotal(planRental(SPEC_CARD, SPEC_TIERS, 240)!)).toBe(2890)
  })
})

describe('planRental', () => {
  it('lets a cover overshoot when that is cheaper', () => {
    // Daily × 6 is $2,400; one Weekly is $2,200, less 10% for reaching 3 days.
    expect(summary(planRental(SPEC_CARD, SPEC_TIERS, 6 * 24))).toEqual({
      kind: 'combo',
      lines: [['Weekly', 1]],
      subtotal: 2200,
      discount: 220,
    })
  })

  it('reaches tiers in fractional days', () => {
    // Friday 17:00 to Monday 21:00 is 3.17 days: past the 3-day tier, and four days' cover.
    const hours = (Date.parse('2026-10-05T21:00:00Z') - Date.parse('2026-10-02T17:00:00Z')) / 3_600_000
    expect(summary(planRental(SPEC_CARD, SPEC_TIERS, hours))).toEqual({
      kind: 'combo',
      lines: [['Daily', 4]],
      subtotal: 1600,
      discount: 160,
    })
  })

  it('gives a sub-day rental no day tier', () => {
    expect(summary(planRental([DAILY], SPEC_TIERS, 6))).toEqual({
      kind: 'combo',
      lines: [['Daily', 1]],
      subtotal: 400,
      discount: 0,
    })
  })

  it('repeats the package on a fixed-only card, undiscounted', () => {
    const block = option({
      label: '4-Hour Block',
      basis: 'fixed',
      rate: 80,
      blockDuration: 4,
      blockDurationUnit: 'hours',
    })
    expect(summary(planRental([block], SPEC_TIERS, 6))).toEqual({
      kind: 'repeat',
      lines: [['4-Hour Block', 2]],
      subtotal: 160,
      discount: 0,
    })
    // Five days of blocks still takes nothing off: packages are never discounted.
    expect(planRental([block], SPEC_TIERS, 5 * 24)!.discount).toBeNull()
  })

  it('has no plan without options', () => {
    expect(planRental([], SPEC_TIERS, 24)).toBeNull()
  })

  it('rounds the discount half-up', () => {
    // $14.75 × 3 = $44.25; 10% is 442.5 cents, which banker's rounding would make 442.
    const plan = planRental([option({ rate: 14.75 })], [{ minDays: 3, percentOff: 10 }], 3 * 24)
    expect(plan!.discount!.amount).toBe(4.43)
  })

  it('lets the first of two equal rates win', () => {
    const first = option({ id: 'a', label: 'Daily A', rate: 400 })
    const second = option({ id: 'b', label: 'Daily B', rate: 400 })
    expect(summary(planRental([first, second], [], 48)).lines).toEqual([['Daily A', 2]])
  })

  it('makes the whole rental unlimited when one piece is', () => {
    const unlimitedWeekly = { ...WEEKLY, includedMiles: undefined, unlimitedMileage: true }
    const plan = planRental([DAILY, unlimitedWeekly], [], 10 * 24)
    expect(plan!.kind).toBe('combo')
    expect(plan!.includedMiles).toBeNull()
  })

  it('adds up the miles of limited pieces', () => {
    expect(planRental(SPEC_CARD, [], 10 * 24)!.includedMiles).toBe(1500 + 3 * 200)
  })
})

describe('previewDays', () => {
  it('adds each option’s own length and each tier threshold to the standard lengths', () => {
    const fortnight = option({ basis: 'fixed', blockDuration: 2, blockDurationUnit: 'weeks' })
    expect(previewDays([DAILY, fortnight], [{ minDays: 30, percentOff: 50 }])).toEqual([
      1, 3, 4, 7, 10, 14, 30,
    ])
  })

  it('leaves out a package shorter than a day, which no whole-day row can match', () => {
    const block = option({ basis: 'fixed', blockDuration: 4, blockDurationUnit: 'hours' })
    expect(previewDays([block], [])).toEqual([1, 3, 4, 7, 10, 14])
  })
})

describe('the daily cap on hourly billing', () => {
  // Hourly billing stops at the cap: 8 × $15 = $120 a day.
  const HOURLY = option({ id: 'hourly', label: 'Hourly', basis: 'hour', rate: 15, includedMiles: 20 })
  const lines = (plan: RatePlan | null) =>
    plan!.lines.map((l) => [l.option.label, l.count, l.cappedHours ?? null])

  it('caps each full day of hourly billing', () => {
    // 2 days + 4 hours: two capped days, then the 4 hours at the hourly rate.
    const plan = planRental([HOURLY], [], 52, 8)
    expect(lines(plan)).toEqual([
      ['Hourly', 2, 8],
      ['Hourly', 4, null],
    ])
    expect(plan!.subtotal).toBe(300)
  })

  it('caps a part day that would cost more', () => {
    // 10 hours is $150 by the hour; the capped day is $120.
    expect(lines(planRental([HOURLY], [], 10, 8))).toEqual([['Hourly', 1, 8]])
  })

  it('lets a daily rate below the cap still win', () => {
    const daily = option({ id: 'daily', label: 'Daily', rate: 100 })
    expect(lines(planRental([HOURLY, daily], [], 52, 8))).toEqual([
      ['Daily', 2, null],
      ['Hourly', 4, null],
    ])
  })

  it('gives the operator’s own daily rate a tie', () => {
    const daily = option({ id: 'daily', label: 'Daily', rate: 120 })
    expect(lines(planRental([HOURLY, daily], [], 48, 8))).toEqual([['Daily', 2, null]])
  })

  it('treats a daily rate as the cap, even when dearer than capped hours', () => {
    // Hourly $30 capped at 6 h would be $180 a day; the operator priced a day at $200.
    const hourly = option({ id: 'h30', label: 'Hourly', basis: 'hour', rate: 30 })
    const daily = option({ id: 'd200', label: 'Daily', rate: 200 })
    const plan = planRental([hourly, daily], [], 100, 6)
    expect(lines(plan)).toEqual([
      ['Daily', 4, null],
      ['Hourly', 4, null],
    ])
    expect(plan!.subtotal).toBe(920)
  })

  it('turns off at twenty-four hours', () => {
    expect(lines(planRental([HOURLY], [], 52, 24))).toEqual([['Hourly', 52, null]])
  })

  it('includes the miles of the hours paid for', () => {
    expect(planRental([HOURLY], [], 52, 8)!.includedMiles).toBe(2 * 8 * 20 + 4 * 20)
  })

  it('still treats one hour as an exact match', () => {
    expect(planRental([HOURLY], [], 1, 8)!.kind).toBe('exact')
  })
})
