import { describe, expect, it } from 'vitest'
import type { RateOption, Vehicle } from '@/modules/vehicles/types/vehicle.types'
import { billableUnits, durationHours, priceBooking, rentalDays } from './booking.pricing'

/**
 * These figures are the contract between this file and its Python port in the API
 * (`app/modules/bookings/pricing.py`). The form quotes a price before the booking exists and
 * the server re-computes it on create, so a drift here is a renter being charged something
 * other than what they agreed to. The same cases are asserted in `tests/test_bookings.py`.
 */

function option(overrides: Partial<RateOption> = {}): RateOption {
  return {
    id: 'o1',
    label: 'Daily',
    basis: 'day',
    rate: 55,
    includedMiles: 200,
    unlimitedMileage: false,
    ...overrides,
  }
}

function vehicle(taxRatePct: number | undefined, deposit = 350): Vehicle {
  return { fees: { taxRatePct, deposit } } as Vehicle
}

describe('billableUnits', () => {
  it('always rounds a part-used unit up, and never bills less than one', () => {
    expect(billableUnits(option(), 26)).toBe(2)
    expect(billableUnits(option(), 24)).toBe(1)
    expect(billableUnits(option(), 0.5)).toBe(1)
    // A week-long option over eight days is two weeks, not one-and-a-bit.
    expect(billableUnits(option({ basis: 'week' }), 24 * 8)).toBe(2)
  })

  it('bills a fixed block by its own duration', () => {
    const weekend = option({ basis: 'fixed', blockDuration: 3, blockDurationUnit: 'days' })
    expect(billableUnits(weekend, 24 * 3)).toBe(1)
    expect(billableUnits(weekend, 24 * 4)).toBe(2)
  })
})

describe('durationHours', () => {
  it('treats a missing, unparseable or reversed range as no rental', () => {
    expect(durationHours('2026-10-01T00:00:00Z', '2026-10-02T00:00:00Z')).toBe(24)
    expect(durationHours('2026-10-02T00:00:00Z', '2026-10-01T00:00:00Z')).toBe(0)
    expect(durationHours('nonsense', '2026-10-02T00:00:00Z')).toBe(0)
  })
})

describe('rentalDays', () => {
  it('rounds up and never returns zero', () => {
    expect(rentalDays(24)).toBe(1)
    expect(rentalDays(25)).toBe(2)
    expect(rentalDays(0)).toBe(1)
  })
})

describe('priceBooking — the figures the API must agree with', () => {
  it('prices a four-day rental with a driver and a fee', () => {
    const daily = option()
    const pricing = priceBooking({
      vehicle: vehicle(7),
      option: daily,
      pickupAt: '2026-10-01T13:30:00Z',
      returnAt: '2026-10-05T13:30:00Z',
      additionalDrivers: [{ pricePerDay: 12 }],
      fees: [{ id: 'f1', label: 'Child seat', amount: 25 }],
    })

    // 4 × $55 = $220, 4 days × $12 = $48, + $25 = $293; 7% = $20.51.
    expect(pricing.rentalSubtotal).toBe(220)
    expect(pricing.drivers?.amount).toBe(48)
    expect(pricing.feesTotal).toBe(25)
    expect(pricing.subtotal).toBe(293)
    expect(pricing.tax).toBe(20.51)
    expect(pricing.total).toBe(313.51)
    expect(pricing.deposit).toBe(350)
    expect(pricing.includedMiles).toBe(800)
  })

  it('charges a full week for a short trip on a weekly rate', () => {
    const weekly = option({ basis: 'week', rate: 300, includedMiles: 1000 })
    const pricing = priceBooking({
      vehicle: vehicle(0),
      option: weekly,
      pickupAt: '2026-11-01T13:00:00Z',
      returnAt: '2026-11-02T13:00:00Z',
    })

    expect(pricing.units).toBe(1)
    expect(pricing.rentalSubtotal).toBe(300)
    expect(pricing.total).toBe(300)
  })

  it('rounds tax half up, the way the Python port does', () => {
    // $33.33 × 1 day at 7.5% is 2.49975 → 2.50, not 2.49.
    const pricing = priceBooking({
      vehicle: vehicle(7.5),
      option: option({ rate: 33.33 }),
      pickupAt: '2026-10-01T00:00:00Z',
      returnAt: '2026-10-02T00:00:00Z',
    })

    expect(pricing.tax).toBe(2.5)
  })

  it('treats a vehicle with no tax rate as zero rather than skipping the line', () => {
    const pricing = priceBooking({
      vehicle: vehicle(undefined),
      option: option({ rate: 100 }),
      pickupAt: '2026-10-01T00:00:00Z',
      returnAt: '2026-10-03T00:00:00Z',
    })

    expect(pricing.taxRatePct).toBe(0)
    expect(pricing.tax).toBe(0)
    expect(pricing.total).toBe(200)
  })

  it('reports unlimited mileage as null rather than zero miles', () => {
    const pricing = priceBooking({
      vehicle: vehicle(0),
      option: option({ unlimitedMileage: true, includedMiles: undefined }),
      pickupAt: '2026-10-01T00:00:00Z',
      returnAt: '2026-10-03T00:00:00Z',
    })

    expect(pricing.includedMiles).toBeNull()
  })
})
