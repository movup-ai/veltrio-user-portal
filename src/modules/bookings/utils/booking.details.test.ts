import { describe, expect, it } from 'vitest'
import { BOOKINGS_RECENT, BOOKINGS_UPCOMING } from '../mock/booking.mock'
import type { Booking } from '../types/booking.types'
import { buildBookingDetails, buildCharges, exactCharges } from './booking.details'
import { parseBookingTotal } from './booking.utils'

function sum(amounts: number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0)
}

describe('buildCharges', () => {
  it('bills the base at the list rate and reconciles the rest into fees', () => {
    const lines = buildCharges(1240, 4, 189, 7, [])

    expect(lines.find((l) => l.key === 'baseRate')?.amount).toBe(756)
    expect(sum(lines.map((l) => l.amount))).toBe(1240)
  })

  it('keeps extras intact and still adds up', () => {
    const lines = buildCharges(900, 3, 139, 7, [
      { key: 'additionalDriver', meta: { count: 1, rate: 12 }, amount: 36 },
    ])

    expect(lines.find((l) => l.key === 'additionalDriver')?.amount).toBe(36)
    expect(sum(lines.map((l) => l.amount))).toBe(900)
  })

  it('falls back to deriving the base when the list rate alone would overshoot', () => {
    const lines = buildCharges(310, 5, 99, 7, [])
    const base = lines.find((l) => l.key === 'baseRate')?.amount ?? 0

    expect(base).toBeLessThan(99 * 5)
    expect(lines.every((l) => l.amount >= 0)).toBe(true)
    expect(sum(lines.map((l) => l.amount))).toBe(310)
  })
})

describe('buildBookingDetails', () => {
  it('builds every seeded booking with charges that add up', () => {
    for (const tuple of [...BOOKINGS_UPCOMING, ...BOOKINGS_RECENT]) {
      const details = buildBookingDetails(tuple)

      expect(details.reference).toBe(tuple[1])
      expect(details.days).toBeGreaterThan(0)
      expect(sum(details.charges.map((l) => l.amount))).toBe(details.total)
      // Refunds are stored negative on the row but shown as an amount, never a negative total.
      expect(details.total).toBe(Math.abs(parseBookingTotal(tuple[8])))
    }
  })

  it('marks a completed rental as finished', () => {
    const completed = buildBookingDetails(BOOKINGS_RECENT.find((b) => b[7] === 'Completed')!)

    expect(completed.stages.every((s) => s.state === 'done')).toBe(true)
  })
})

describe('exactCharges', () => {
  it('lists each combined rate and takes the discount off, still summing to the total', () => {
    // Weekly + Daily × 3 = $3,400, less 15% for 7+ days = $2,890; 10% tax = $289.
    const booking = {
      rate: {
        lines: [
          { optionId: 'w', label: 'Weekly', basis: 'week', rate: 2200, count: 1 },
          { optionId: 'd', label: 'Daily', basis: 'day', rate: 400, count: 3 },
        ],
      },
      pricing: {
        rentalSubtotal: 3400,
        discount: { minDays: 7, percentOff: 15, amount: 510 },
        drivers: 0,
        fees: 0,
        subtotal: 2890,
        taxRatePct: 10,
        tax: 289,
        total: 3179,
        deposit: 0,
      },
      additionalDrivers: [],
      fees: [],
    } as unknown as Booking

    const lines = exactCharges(booking)

    expect(lines.map((l) => [l.key, l.label, l.amount])).toEqual([
      ['baseRate', 'Weekly', 2200],
      ['baseRate', 'Daily', 1200],
      ['discount', undefined, -510],
      ['taxes', undefined, 289],
    ])
    expect(sum(lines.map((l) => l.amount))).toBe(booking.pricing.total)
  })

  it('keeps the cap on an automatic hourly day, so the line can say so', () => {
    const booking = {
      rate: {
        lines: [{ optionId: 'h', label: 'Hourly', basis: 'day', rate: 120, count: 2, cappedHours: 8 }],
      },
      pricing: { discount: null, taxRatePct: 0, tax: 0, total: 240 },
      additionalDrivers: [],
      fees: [],
    } as unknown as Booking

    expect(exactCharges(booking)[0].meta).toEqual({ rate: 120, count: 2, cappedHours: 8 })
  })
})
