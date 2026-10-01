import { describe, expect, it } from 'vitest'
import { toListQuery, toVehicle, toVehiclePayload, type VehicleWire } from './vehicle.mapper'
import { VEHICLE_SORTS } from '../types/vehicle.types'
import type { VehicleInput, VehicleListParams } from '../types/vehicle.types'

const wire: VehicleWire = {
  id: 'a1',
  make: 'Toyota',
  model: 'Camry',
  year: 2024,
  vehicleType: 'pickup_truck',
  color: 'Silver',
  plate: 'ABC1234',
  vin: '4T1B11HK512345678',
  uri: 'toyota-camry-2024',
  location: 'Downtown',
  status: 'on_rent',
  mileage: 12000,
  utilization: 73,
  description: null,
  notes: null,
  photos: [
    {
      id: 'p1',
      name: 'front.jpg',
      status: 'ready',
      width: 4032,
      height: 3024,
      variants: [
        { size: 'thumbnail', width: 400, height: 300, url: 'https://cdn/thumb.webp' },
        { size: 'medium', width: 1200, height: 900, url: 'https://cdn/medium.webp' },
        { size: 'large', width: 2000, height: 1500, url: 'https://cdn/large.webp' },
      ],
      createdAt: '2026-01-01T00:00:00Z',
    },
  ],
  rateOptions: [
    {
      id: 'r1',
      label: 'Daily',
      basis: 'day',
      rateCents: 5500,
      blockDuration: null,
      blockDurationUnit: null,
      includedMiles: 200,
      unlimitedMileage: false,
    },
  ],
  discountTiers: [{ minDays: 3, percentOff: 10 }],
  billableHoursPerDay: 8,
  fees: {
    depositCents: 50000,
    overageRatePerMileCents: 75,
    fuelChargeRateCents: null,
    taxRatePct: 8.25,
  },
  specs: { transmission: 'automatic', fuelType: 'petrol', seats: 5, doors: 4 },
  features: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
}

const input: VehicleInput = {
  make: 'Toyota',
  model: 'Camry',
  year: 2024,
  vehicleType: 'SUV',
  color: 'Silver',
  plate: 'ABC1234',
  vin: '4T1B11HK512345678',
  location: 'Downtown',
  status: 'Out of service',
  mileage: 12000,
  photos: [{ id: 'p1', url: 'data:image/png;base64,xx', name: 'front.jpg' }],
  rateOptions: [
    { id: 'client-uuid', label: 'Daily', basis: 'day', rate: 55, includedMiles: 200, unlimitedMileage: false },
  ],
  discountTiers: [{ minDays: 3, percentOff: 10 }],
  billableHoursPerDay: 8,
  fees: { deposit: 500, overageRatePerMile: 0.75, taxRatePct: 8.25 },
  specs: { transmission: 'Manual', fuelType: 'Electric', seats: 5, doors: 4 },
  features: ['airConditioning', 'sunroof'],
}

describe('toVehicle', () => {
  it('decodes slugs to the portal’s canonical English', () => {
    const vehicle = toVehicle(wire)
    expect(vehicle.vehicleType).toBe('Pickup-truck')
    expect(vehicle.status).toBe('On rent')
    expect(vehicle.specs.transmission).toBe('Automatic')
    expect(vehicle.specs.fuelType).toBe('Petrol')
  })

  it('converts cents to dollars', () => {
    const vehicle = toVehicle(wire)
    expect(vehicle.rateOptions[0].rate).toBe(55)
    expect(vehicle.fees.deposit).toBe(500)
    expect(vehicle.fees.overageRatePerMile).toBe(0.75)
    // A null fee is absent, not zero — the form must not render a 0 the user never typed.
    expect(vehicle.fees.fuelChargeRate).toBeUndefined()
    expect(vehicle.fees.taxRatePct).toBe(8.25)
  })

  it('rescales utilization from a percentage to a fraction', () => {
    expect(toVehicle(wire).utilization).toBeCloseTo(0.73)
  })

  it('picks the medium variant as the primary url and keeps the rest', () => {
    const [photo] = toVehicle(wire).photos
    expect(photo.url).toBe('https://cdn/medium.webp')
    expect(photo.variants).toHaveLength(3)
    expect(photo.width).toBe(4032)
  })

  it('leaves a still-processing photo without a url rather than a broken one', () => {
    const processing = { ...wire, photos: [{ ...wire.photos[0], status: 'processing' as const, variants: [] }] }
    const [photo] = toVehicle(processing).photos
    expect(photo.url).toBe('')
    expect(photo.variants).toBeUndefined()
  })

  it('falls back instead of throwing on a slug it does not know', () => {
    expect(toVehicle({ ...wire, vehicleType: 'hovercraft' }).vehicleType).toBe('Sedan')
  })

  it('decodes feature slugs and drops ones it does not recognize', () => {
    const extra = { ...wire, features: ['apple_car_play', 'ejector_seat'] }
    expect(toVehicle(extra).features).toEqual(['appleCarPlay'])
  })
})

describe('toVehiclePayload', () => {
  const payload = toVehiclePayload(input)

  it('encodes enums as slugs', () => {
    expect(payload.vehicleType).toBe('suv')
    expect(payload.status).toBe('out_of_service')
    expect(payload.specs.transmission).toBe('manual')
    expect(payload.specs.fuelType).toBe('electric')
    expect(payload.features).toEqual(['air_conditioning', 'sunroof'])
  })

  it('converts dollars to integer cents', () => {
    expect(payload.rateOptions[0].rateCents).toBe(5500)
    expect(payload.fees.depositCents).toBe(50000)
    // 0.75 * 100 is 75.00000000000001 in binary floating point; the API rejects a non-integer.
    expect(payload.fees.overageRatePerMileCents).toBe(75)
    expect(Number.isInteger(payload.fees.overageRatePerMileCents)).toBe(true)
  })

  it('omits an unset fee as null rather than dropping the key', () => {
    expect(payload.fees.fuelChargeRateCents).toBeNull()
  })

  it('never sends photos or rate option ids, which the API rejects', () => {
    expect(payload).not.toHaveProperty('photos')
    expect(payload.rateOptions[0]).not.toHaveProperty('id')
  })

  it('sends discount tiers without a form row id, which the API would reject', () => {
    // The form keys its rows with an id; a tier that carried one through would be a 422.
    const withRowId = { ...input, discountTiers: [{ id: 'row-1', minDays: 3, percentOff: 10 }] }
    expect(toVehiclePayload(withRowId).discountTiers).toEqual([{ minDays: 3, percentOff: 10 }])
  })

  it('omits notes entirely rather than nulling a field the wizard never edits', () => {
    expect(payload).not.toHaveProperty('notes')
    expect(toVehiclePayload({ ...input, notes: 'Chip in windshield' })).toMatchObject({
      notes: 'Chip in windshield',
    })
  })
})

describe('toListQuery', () => {
  const base: VehicleListParams = { page: 3, pageSize: 20 }

  it('translates page/pageSize to limit/offset', () => {
    expect(toListQuery(base)).toEqual({ limit: 20, offset: 40 })
  })

  it('drops the "no filter" sentinels, which are not valid enum values', () => {
    const query = toListQuery({
      ...base,
      status: 'Any',
      location: 'All',
      vehicleType: 'All',
      transmission: 'Any',
      fuelType: 'Any',
      priceBands: [],
      search: '   ',
    })
    expect(query).toEqual({ limit: 20, offset: 40 })
  })

  it('encodes active filters as slugs', () => {
    const query = toListQuery({ ...base, status: 'On rent', vehicleType: 'SUV', sortBy: 'dailyRate' })
    expect(query).toMatchObject({ status: 'on_rent', vehicleType: 'suv', sortBy: 'daily_rate' })
  })

  it('sends every sort the portal offers', () => {
    // An unmapped sort would reach the API as undefined and silently fall back to name order.
    for (const sortBy of VEHICLE_SORTS) {
      expect(toListQuery({ ...base, sortBy }).sortBy).toBeTypeOf('string')
    }
    expect(toListQuery({ ...base, sortBy: 'manual' })).toMatchObject({ sortBy: 'manual' })
  })

  it('sends price bands under the API’s singular repeated key', () => {
    expect(toListQuery({ ...base, priceBands: ['0-50', '200+'] })).toMatchObject({
      priceBand: ['0-50', '200+'],
    })
  })
})
