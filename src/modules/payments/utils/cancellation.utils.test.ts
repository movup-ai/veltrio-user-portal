import { describe, expect, it } from 'vitest'
import type { CancellationQuote } from '../types/booking-payment.types'
import {
  hasSuggestion,
  refundChoice,
  refundPresets,
  refundSplit,
  suggestedPreset,
  suggestedRefund,
} from './cancellation.utils'

function quote(overrides: Partial<CancellationQuote> = {}): CancellationQuote {
  return {
    cancel: { allowed: true },
    currency: 'USD',
    paid: 235.4,
    paidByHand: 0,
    depositHeld: 0,
    withdrawsLink: false,
    emailsRenter: true,
    ...overrides,
  }
}

describe('suggestedRefund', () => {
  const underPolicy = quote({
    policy: [{ daysBefore: 7, refundPercent: 50 }],
    refundPercent: 50,
    policyRefund: 117.7,
  })

  it('follows the policy when the renter cancels or does not show up', () => {
    expect(suggestedRefund(underPolicy, 'renter_request')).toBe(117.7)
    expect(suggestedRefund(underPolicy, 'no_show')).toBe(117.7)
    expect(suggestedRefund(underPolicy, undefined)).toBe(117.7)
  })

  it('is everything when the company is the one that cannot go through with it', () => {
    expect(suggestedRefund(underPolicy, 'vehicle_unavailable')).toBe(235.4)
  })

  it('is everything when the booking has no policy to keep anything under', () => {
    expect(suggestedRefund(quote(), 'renter_request')).toBe(235.4)
  })

  it('is nothing for a renter cancelling a non-refundable booking', () => {
    const nonRefundable = quote({ policy: [], refundPercent: 0, policyRefund: 0 })

    expect(suggestedRefund(nonRefundable, 'renter_request')).toBe(0)
  })
})

describe('refundPresets', () => {
  it("offers the policy's own figure only when it is neither everything nor nothing", () => {
    const keys = (overrides: Partial<CancellationQuote>) => refundPresets(quote(overrides)).map((p) => p.key)

    expect(refundPresets(quote({ policy: [], refundPercent: 50, policyRefund: 117.7 }))).toEqual([
      { key: 'full', amount: 235.4 },
      { key: 'policy', amount: 117.7 },
      { key: 'none', amount: 0 },
    ])
    expect(keys({ policy: [], refundPercent: 100, policyRefund: 235.4 })).toEqual(['full', 'none'])
    expect(keys({ policy: [], refundPercent: 0, policyRefund: 0 })).toEqual(['full', 'none'])
    expect(keys({})).toEqual(['full', 'none'])
  })
})

describe('suggestedPreset', () => {
  const half = quote({
    policy: [{ daysBefore: 7, refundPercent: 50 }],
    refundPercent: 50,
    policyRefund: 117.7,
  })

  it('is the answer the suggested refund comes to', () => {
    expect(suggestedPreset(half, 'renter_request')).toBe('policy')
    expect(suggestedPreset(half, 'vehicle_unavailable')).toBe('full')
    expect(suggestedPreset(quote({ policy: [], refundPercent: 0, policyRefund: 0 }), 'no_show')).toBe('none')
    expect(suggestedPreset(quote({ policy: [], refundPercent: 100, policyRefund: 235.4 }), undefined)).toBe(
      'full',
    )
    expect(suggestedPreset(quote(), 'other')).toBe('full')
  })
})

describe('refundChoice', () => {
  const offered = refundPresets(quote({ policy: [], refundPercent: 50, policyRefund: 117.7 }))
  const withoutPolicy = refundPresets(quote())

  it("is the counter's own answer while that is still one of those offered", () => {
    expect(refundChoice('none', offered, 'policy')).toBe('none')
    expect(refundChoice('policy', offered, 'full')).toBe('policy')
    expect(refundChoice('custom', withoutPolicy, 'full')).toBe('custom')
  })

  it('is the suggested one until the counter picks, and again if their pick is withdrawn', () => {
    expect(refundChoice(undefined, offered, 'policy')).toBe('policy')
    // The quote was read again and the policy's figure is no longer a third answer.
    expect(refundChoice('policy', withoutPolicy, 'full')).toBe('full')
  })
})

describe('hasSuggestion', () => {
  it('needs a policy or the company being at fault to stand behind the starting answer', () => {
    expect(hasSuggestion(quote({ policy: [] }), 'renter_request')).toBe(true)
    expect(hasSuggestion(quote(), 'vehicle_unavailable')).toBe(true)
    expect(hasSuggestion(quote(), 'renter_request')).toBe(false)
    expect(hasSuggestion(quote(), undefined)).toBe(false)
  })
})

describe('refundSplit', () => {
  it('sends a refund back to the card before any cash is handed back', () => {
    const mixed = quote({ paidByHand: 50 })

    expect(refundSplit(mixed, 100)).toEqual({ toCard: 100, byHand: 0, kept: 135.4 })
    expect(refundSplit(mixed, 215.4)).toEqual({ toCard: 185.4, byHand: 30, kept: 20 })
  })

  it('is all by hand when everything was paid in person', () => {
    expect(refundSplit(quote({ paidByHand: 235.4 }), 235.4)).toEqual({ toCard: 0, byHand: 235.4, kept: 0 })
  })

  it('works in whole cents, so the parts always add up to what was paid', () => {
    // 235.4 - 19.99 is 215.41000000000003 in floating point.
    expect(refundSplit(quote(), 19.99)).toEqual({ toCard: 19.99, byHand: 0, kept: 215.41 })
  })

  it('never sends back more than was paid, or less than nothing', () => {
    expect(refundSplit(quote(), 999)).toEqual({ toCard: 235.4, byHand: 0, kept: 0 })
    expect(refundSplit(quote(), -5)).toEqual({ toCard: 0, byHand: 0, kept: 235.4 })
  })
})
