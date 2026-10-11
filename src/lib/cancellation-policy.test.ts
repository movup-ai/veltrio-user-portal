import { describe, expect, it } from 'vitest'
import {
  MAX_CANCELLATION_TIERS,
  POLICY_PRESETS,
  nextTier,
  policyChoice,
  policyRows,
  samePolicy,
  tierProblems,
} from './cancellation-policy'

const tier = (daysBefore: number, refundPercent: number) => ({ daysBefore, refundPercent })

describe('policyChoice', () => {
  it('tells no policy from a non-refundable one', () => {
    expect(policyChoice(undefined)).toBe('none')
    expect(policyChoice([])).toBe('nonRefundable')
  })

  it('recognises a preset by its tiers, and calls anything else custom', () => {
    expect(policyChoice([tier(14, 100), tier(7, 50)])).toBe('standard')
    expect(policyChoice([tier(1, 100)])).toBe('flexible')
    expect(policyChoice([tier(14, 100), tier(7, 40)])).toBe('custom')
  })
})

describe('samePolicy', () => {
  it('compares tier by tier, and never equates no policy with an empty one', () => {
    expect(samePolicy([tier(14, 100)], [tier(14, 100)])).toBe(true)
    expect(samePolicy([tier(14, 100)], [tier(14, 90)])).toBe(false)
    expect(samePolicy(undefined, [])).toBe(false)
    expect(samePolicy(undefined, undefined)).toBe(true)
  })
})

describe('tierProblems', () => {
  it('finds nothing wrong with the presets', () => {
    expect(tierProblems([...POLICY_PRESETS.standard])).toEqual({})
    expect(tierProblems([tier(0, 100)])).toEqual({})
  })

  it('names the tier whose numbers the API would refuse', () => {
    expect(tierProblems([tier(Number.NaN, 100)])).toEqual({ 0: 'days' })
    expect(tierProblems([tier(366, 100)])).toEqual({ 0: 'days' })
    expect(tierProblems([tier(7.5, 100)])).toEqual({ 0: 'days' })
    expect(tierProblems([tier(7, 0)])).toEqual({ 0: 'percent' })
    expect(tierProblems([tier(7, 101)])).toEqual({ 0: 'percent' })
  })

  it('wants notice to shorten and the refund to fall from one tier to the next', () => {
    expect(tierProblems([tier(7, 100), tier(14, 50)])).toEqual({ 1: 'daysOrder' })
    expect(tierProblems([tier(14, 100), tier(14, 50)])).toEqual({ 1: 'daysOrder' })
    expect(tierProblems([tier(14, 50), tier(7, 50)])).toEqual({ 1: 'percentOrder' })
    expect(tierProblems([tier(14, 50), tier(7, 80)])).toEqual({ 1: 'percentOrder' })
  })
})

describe('nextTier', () => {
  it('starts an empty schedule and halves the last tier after that', () => {
    expect(nextTier([])).toEqual(tier(14, 100))
    expect(nextTier([tier(14, 100)])).toEqual(tier(7, 50))
    expect(tierProblems([tier(14, 100), tier(7, 50), nextTier([tier(14, 100), tier(7, 50)])!])).toEqual({})
  })

  it('offers nothing when no tier could go below the last, or the schedule is full', () => {
    expect(nextTier([tier(0, 100)])).toBeUndefined()
    expect(nextTier([tier(7, 1)])).toBeUndefined()
    const full = Array.from({ length: MAX_CANCELLATION_TIERS }, (_, i) => tier(50 - i * 10, 90 - i * 10))
    expect(nextTier(full)).toBeUndefined()
  })
})

describe('policyRows', () => {
  it('spells out each span of notice and the line the tiers leave unsaid', () => {
    expect(policyRows([tier(14, 100), tier(7, 50)])).toEqual([
      { from: 14, to: undefined, refundPercent: 100 },
      { from: 7, to: 13, refundPercent: 50 },
      { from: 0, to: 6, refundPercent: 0 },
    ])
  })

  it('adds no line below a tier that already runs up to the pickup time', () => {
    expect(policyRows([tier(3, 100), tier(0, 25)])).toEqual([
      { from: 3, to: undefined, refundPercent: 100 },
      { from: 0, to: 2, refundPercent: 25 },
    ])
  })

  it('reads a non-refundable policy as one line that refunds nothing', () => {
    expect(policyRows([])).toEqual([{ from: 0, refundPercent: 0 }])
  })
})
