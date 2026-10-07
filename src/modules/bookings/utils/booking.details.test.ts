import { describe, expect, it } from 'vitest'
import { VEHICLES_SEED } from '@/modules/vehicles/mock/vehicle.mock'
import { BOOKINGS_RECENT, BOOKINGS_UPCOMING } from '../mock/booking.mock'
import type { Booking, BookingStageStep } from '../types/booking.types'
import {
  bookingStages,
  buildBookingDetails,
  buildCharges,
  exactCharges,
  rentalDuration,
} from './booking.details'
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

  it('reads an electric vehicle for charge, and any other for fuel', () => {
    const [tuple] = BOOKINGS_UPCOMING
    const vehicle = VEHICLES_SEED[0]
    const electric = { ...vehicle, specs: { ...vehicle.specs, fuelType: 'Electric' as const } }
    const petrol = { ...vehicle, specs: { ...vehicle.specs, fuelType: 'Petrol' as const } }

    expect(buildBookingDetails(tuple, undefined, { vehicle: electric }).vehicleElectric).toBe(true)
    expect(buildBookingDetails(tuple, undefined, { vehicle: petrol }).vehicleElectric).toBe(false)
  })
})

describe('rentalDuration', () => {
  const booked = { from: new Date('2026-10-09T09:00:00Z'), to: new Date('2026-10-09T13:30:00Z') }

  it('keeps the minutes of a booked window', () => {
    // Rounded to whole hours, four and a half hours read as five.
    expect(rentalDuration(booked)).toEqual({ days: 0, hours: 4, minutes: 30 })
  })

  it('is what actually happened once the car is back', () => {
    // Picked up forty minutes late and brought back a day and a bit over.
    const ran = rentalDuration(booked, '2026-10-09T09:40:00Z', '2026-10-10T11:55:00Z')

    expect(ran).toEqual({ days: 1, hours: 2, minutes: 15 })
  })

  it('stays the booked length while the car is still out', () => {
    expect(rentalDuration(booked, '2026-10-09T09:40:00Z')).toEqual({ days: 0, hours: 4, minutes: 30 })
  })
})

describe('bookingStages', () => {
  const SCHEDULE = { pickupAt: '2026-10-14T14:00:00Z', returnAt: '2026-10-20T14:00:00Z' }
  const CREATED = '2026-10-06T09:00:00Z'
  const CONFIRMED = '2026-10-07T11:30:00Z'
  const states = (stages: BookingStageStep[]) => stages.map((s) => s.state)
  const at = (stages: BookingStageStep[]) => Object.fromEntries(stages.map((s) => [s.key, s.at]))

  it('stops a request the renter is still waiting on at Reserved, with the pickup only scheduled', () => {
    const stages = bookingStages({ status: 'Pending', ...SCHEDULE, createdAt: CREATED, channel: 'web' })

    expect(states(stages)).toEqual(['done', 'current', 'pending', 'pending', 'pending'])
    expect(stages[0]).toMatchObject({ at: CREATED, channel: 'web' })
    // Confirming and closing happen when the work is done: no date is promised for either.
    expect(at(stages)).toMatchObject({
      confirmed: undefined,
      pickedUp: SCHEDULE.pickupAt,
      returned: SCHEDULE.returnAt,
      closed: undefined,
    })
  })

  it('dates each step with when it really happened, not when it was scheduled', () => {
    const facts = { ...SCHEDULE, createdAt: CREATED, confirmedAt: CONFIRMED }
    // Collected two hours late and brought back a day early: the schedule would say otherwise.
    const pickedUpAt = '2026-10-14T16:05:00Z'
    const returnedAt = '2026-10-19T10:20:00Z'

    const out = bookingStages({ status: 'On rental', ...facts, pickedUpAt })
    expect(states(out)).toEqual(['done', 'done', 'done', 'current', 'pending'])
    expect(at(out)).toMatchObject({ confirmed: CONFIRMED, pickedUp: pickedUpAt, returned: SCHEDULE.returnAt })

    const back = bookingStages({ status: 'Returned', ...facts, pickedUpAt, returnedAt })
    expect(states(back)).toEqual(['done', 'done', 'done', 'done', 'current'])
    expect(at(back).returned).toBe(returnedAt)

    const completedAt = '2026-10-19T10:45:00Z'
    const closed = bookingStages({ status: 'Completed', ...facts, pickedUpAt, returnedAt, completedAt })
    expect(states(closed)).toEqual(['done', 'done', 'done', 'done', 'done'])
    expect(at(closed).closed).toBe(completedAt)
    // One closed before that was recorded shows as done with no date, rather than a guessed one.
    const undated = bookingStages({ status: 'Completed', ...facts, pickedUpAt, returnedAt })
    expect(undated.at(-1)).toEqual({ key: 'closed', state: 'done', at: undefined, channel: undefined })
  })

  it('ends a declined request at Reserved instead of marking every step done', () => {
    // The bug this pins: Cancelled was treated as the last stage, so a request nobody accepted
    // showed as picked up, returned and closed, each with an invented date.
    const stages = bookingStages({ status: 'Cancelled', ...SCHEDULE, createdAt: CREATED, channel: 'web' })

    expect(states(stages)).toEqual(['done', 'skipped', 'skipped', 'skipped', 'skipped'])
    expect(stages.slice(1).every((s) => s.at === undefined)).toBe(true)
  })

  it('keeps Confirmed for a booking cancelled after it was accepted', () => {
    const stages = bookingStages({
      status: 'Cancelled',
      ...SCHEDULE,
      createdAt: CREATED,
      confirmedAt: CONFIRMED,
    })

    expect(states(stages)).toEqual(['done', 'done', 'skipped', 'skipped', 'skipped'])
    expect(at(stages).confirmed).toBe(CONFIRMED)
  })

  it('shows a step as done without a date when the date was never recorded', () => {
    // A seeded row, or an API older than `confirmedAt`: the status still says how far it got.
    const stages = bookingStages({ status: 'Confirmed', ...SCHEDULE })

    expect(states(stages)).toEqual(['done', 'done', 'current', 'pending', 'pending'])
    expect(at(stages)).toMatchObject({ reserved: undefined, confirmed: undefined })
  })

  it('keeps an overdue car out rather than calling it returned', () => {
    const stages = bookingStages({ status: 'Overdue', ...SCHEDULE })

    expect(states(stages)).toEqual(['done', 'done', 'done', 'current', 'pending'])
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
