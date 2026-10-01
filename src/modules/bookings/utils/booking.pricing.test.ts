import { describe, expect, it } from 'vitest'
import type { DiscountTier, RateOption, Vehicle } from '@/modules/vehicles/types/vehicle.types'
import { durationHours, priceBooking, rentalDays } from './booking.pricing'

/**
 * These figures are the contract between this file and its Python port in the API
 * (`app/modules/bookings/pricing.py`). The form quotes a price before the booking exists and
 * the server re-computes it on create, so a drift here is a renter being charged something
 * other than what they agreed to. The same cases are asserted in `tests/test_pricing_parity.py`;
 * which rates are chosen is covered in `rate-plan.test.ts`.
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

function vehicle(
  taxRatePct: number | undefined,
  rateOptions: RateOption[] = [option()],
  deposit = 350,
  discountTiers: DiscountTier[] = [],
): Vehicle {
  return { fees: { taxRatePct, deposit }, rateOptions, discountTiers } as Vehicle
}

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
    const pricing = priceBooking({
      vehicle: vehicle(7),
      pickupAt: '2026-10-01T13:30:00Z',
      returnAt: '2026-10-05T13:30:00Z',
      additionalDrivers: [{ pricePerDay: 12 }],
      fees: [{ id: 'f1', label: 'Child seat', amount: 25 }],
    })!

    // 4 × $55 = $220, 4 days × $12 = $48, + $25 = $293; 7% = $20.51.
    expect(pricing.rentalSubtotal).toBe(220)
    expect(pricing.discount).toBe(0)
    expect(pricing.drivers?.amount).toBe(48)
    expect(pricing.feesTotal).toBe(25)
    expect(pricing.subtotal).toBe(293)
    expect(pricing.tax).toBe(20.51)
    expect(pricing.total).toBe(313.51)
    expect(pricing.deposit).toBe(350)
    expect(pricing.includedMiles).toBe(800)
  })

  it('takes the discount before tax', () => {
    const card = [
      option({ id: 'daily', rate: 400 }),
      option({ id: 'weekly', label: 'Weekly', basis: 'week', rate: 2200, includedMiles: 1500 }),
    ]
    const pricing = priceBooking({
      vehicle: vehicle(10, card, 350, [{ minDays: 7, percentOff: 15 }]),
      pickupAt: '2026-10-01T10:00:00Z',
      returnAt: '2026-10-11T10:00:00Z',
    })!

    // Weekly + Daily × 3 = $3,400, less 15% = $2,890; 10% tax = $289.
    expect(pricing.rentalSubtotal).toBe(3400)
    expect(pricing.discount).toBe(510)
    expect(pricing.subtotal).toBe(2890)
    expect(pricing.tax).toBe(289)
    expect(pricing.total).toBe(3179)
  })

  it('charges a full week for a short trip on a weekly rate', () => {
    const weekly = option({ basis: 'week', rate: 300, includedMiles: 1000 })
    const pricing = priceBooking({
      vehicle: vehicle(0, [weekly]),
      pickupAt: '2026-11-01T13:00:00Z',
      returnAt: '2026-11-02T13:00:00Z',
    })!

    expect(pricing.rentalSubtotal).toBe(300)
    expect(pricing.total).toBe(300)
  })

  it('rounds tax half up, the way the Python port does', () => {
    // $33.33 × 1 day at 7.5% is 2.49975 → 2.50, not 2.49.
    const pricing = priceBooking({
      vehicle: vehicle(7.5, [option({ rate: 33.33 })]),
      pickupAt: '2026-10-01T00:00:00Z',
      returnAt: '2026-10-02T00:00:00Z',
    })!

    expect(pricing.tax).toBe(2.5)
  })

  it('rounds a fractional tax rate exactly, the way the API’s decimals do', () => {
    // 0.29% of $50.00 is 14.5 cents. In float, $50 × 0.29 lands just under the half and rounded
    // to 14 cents, while the API charged 15.
    const pricing = priceBooking({
      vehicle: vehicle(0.29, [option({ rate: 50 })]),
      pickupAt: '2026-10-01T00:00:00Z',
      returnAt: '2026-10-02T00:00:00Z',
    })!

    expect(pricing.tax).toBe(0.15)
  })

  it('adds drivers and fees in whole cents, as the API does', () => {
    // $0.10 a day for 3 days is 0.30000000000000004 in float dollars.
    const pricing = priceBooking({
      vehicle: vehicle(0, [option({ rate: 0.2 })]),
      pickupAt: '2026-10-01T00:00:00Z',
      returnAt: '2026-10-04T00:00:00Z',
      additionalDrivers: [{ pricePerDay: 0.1 }],
    })!

    expect(pricing.drivers?.amount).toBe(0.3)
    expect(pricing.total).toBe(0.9)
  })

  it('treats a vehicle with no tax rate as zero rather than skipping the line', () => {
    const pricing = priceBooking({
      vehicle: vehicle(undefined, [option({ rate: 100 })]),
      pickupAt: '2026-10-01T00:00:00Z',
      returnAt: '2026-10-03T00:00:00Z',
    })!

    expect(pricing.taxRatePct).toBe(0)
    expect(pricing.tax).toBe(0)
    expect(pricing.total).toBe(200)
  })

  it('reports unlimited mileage as null rather than zero miles', () => {
    const pricing = priceBooking({
      vehicle: vehicle(0, [option({ unlimitedMileage: true, includedMiles: undefined })]),
      pickupAt: '2026-10-01T00:00:00Z',
      returnAt: '2026-10-03T00:00:00Z',
    })!

    expect(pricing.includedMiles).toBeNull()
  })

  it('cannot price a vehicle with no rates', () => {
    const pricing = priceBooking({
      vehicle: vehicle(0, []),
      pickupAt: '2026-10-01T00:00:00Z',
      returnAt: '2026-10-02T00:00:00Z',
    })

    expect(pricing).toBeNull()
  })
})
