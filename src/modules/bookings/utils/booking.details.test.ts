import { describe, expect, it } from 'vitest'
import { BOOKINGS_RECENT, BOOKINGS_UPCOMING } from '../mock/booking.mock'
import { buildBookingDetails, buildCharges } from './booking.details'
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

  it('marks a completed rental as finished and a deposit-due one as unsettled', () => {
    const completed = buildBookingDetails(BOOKINGS_RECENT.find((b) => b[7] === 'Completed')!)
    const depositDue = buildBookingDetails(BOOKINGS_UPCOMING.find((b) => b[7] === 'Deposit due')!)

    expect(completed.stages.every((s) => s.state === 'done')).toBe(true)
    expect(completed.payment.settled).toBe(true)

    expect(depositDue.payment.settled).toBe(false)
    expect(depositDue.payment.balance).toBe(depositDue.total)
  })
})
