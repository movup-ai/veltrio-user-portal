import { describe, expect, it } from 'vitest'
import { percentOfCents, toCents } from './money'

describe('toCents', () => {
  it('lands on a whole cent where float multiplication would not', () => {
    // 0.75 * 100 is 75.00000000000001; the API rejects a non-integer.
    expect(toCents(0.75)).toBe(75)
  })
})

describe('percentOfCents', () => {
  it('rounds an exact half-cent up, like the API', () => {
    // 0.29% of 5000 cents is 14.5; float arithmetic gave 14.
    expect(percentOfCents(5000, 0.29)).toBe(15)
    // 10% of 4425 cents is 442.5.
    expect(percentOfCents(4425, 10)).toBe(443)
  })

  it('agrees with exact half-up arithmetic across two-decimal rates', () => {
    const exact = (cents: number, basisPoints: number) => {
      const n = BigInt(cents) * BigInt(basisPoints)
      const q = n / 10_000n
      return Number((n % 10_000n) * 2n >= 10_000n ? q + 1n : q)
    }
    for (let basisPoints = 1; basisPoints <= 2500; basisPoints += 7) {
      for (let cents = 1; cents <= 500_000; cents += 997) {
        expect(percentOfCents(cents, basisPoints / 100)).toBe(exact(cents, basisPoints))
      }
    }
  })
})
