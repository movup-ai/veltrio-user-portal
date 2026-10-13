import { describe, expect, it } from 'vitest'
import { VEHICLES_SEED } from '@/modules/vehicles/mock/vehicle.mock'
import type { Vehicle } from '@/modules/vehicles/types/vehicle.types'
import { isTaken, searchVehicleOptions } from './booking.vehicle-options'

const car = (index: number, overrides: Partial<Vehicle>): Vehicle => ({
  ...VEHICLES_SEED[index],
  ...overrides,
})

const ACCORD = car(0, {
  id: 'a',
  make: 'Honda',
  model: 'Accord',
  plate: 'FL·8KJ-205',
  location: 'Miami Beach',
})
const TWIN = car(1, { id: 'b', make: 'Honda', model: 'Accord', plate: 'FL·7VC-283', location: 'Miami Beach' })
const BRONCO = car(2, {
  id: 'c',
  make: 'Ford',
  model: 'Bronco',
  plate: 'TX 3HX 517',
  location: 'Cancún Centro',
})

const OPTIONS = [{ vehicle: ACCORD }, { vehicle: TWIN }, { vehicle: BRONCO }]
const ids = (options: { vehicle: Vehicle }[]) => options.map((option) => option.vehicle.id)

describe('isTaken', () => {
  it('is so for a car booked on the dates or still out, and not for a free one', () => {
    expect(isTaken({ vehicle: ACCORD })).toBe(false)
    expect(isTaken({ vehicle: ACCORD, bookedUntil: '2026-10-18T10:00:00Z' })).toBe(true)
    expect(isTaken({ vehicle: ACCORD, outOn: 'BK-10002' })).toBe(true)
  })
})

describe('searchVehicleOptions', () => {
  it('lists everything while nothing is typed', () => {
    expect(ids(searchVehicleOptions(OPTIONS, '  '))).toEqual(['a', 'b', 'c'])
  })

  it('finds a car by its name, whatever the case', () => {
    expect(ids(searchVehicleOptions(OPTIONS, 'bronco'))).toEqual(['c'])
    expect(ids(searchVehicleOptions(OPTIONS, 'HONDA acc'))).toEqual(['a', 'b'])
  })

  it('finds a plate typed without its dots, dashes and spaces', () => {
    // Four Accords tell apart only by plate, and nobody types the middle dot.
    expect(ids(searchVehicleOptions(OPTIONS, '8kj205'))).toEqual(['a'])
    expect(ids(searchVehicleOptions(OPTIONS, 'fl-7vc'))).toEqual(['b'])
    expect(ids(searchVehicleOptions(OPTIONS, '3hx517'))).toEqual(['c'])
  })

  it('takes every word, so a name narrows down with part of a plate', () => {
    expect(ids(searchVehicleOptions(OPTIONS, 'accord 283'))).toEqual(['b'])
    expect(ids(searchVehicleOptions(OPTIONS, 'accord 517'))).toEqual([])
  })

  it('finds a branch typed without its accents', () => {
    expect(ids(searchVehicleOptions(OPTIONS, 'cancun'))).toEqual(['c'])
  })

  it('keeps cars that cannot be picked at the end, in the order they came', () => {
    const mixed = [{ vehicle: ACCORD, outOn: 'BK-10002' }, { vehicle: TWIN }, { vehicle: BRONCO }]

    expect(ids(searchVehicleOptions(mixed, ''))).toEqual(['b', 'c', 'a'])
    expect(ids(searchVehicleOptions(mixed, 'accord'))).toEqual(['b', 'a'])
  })
})
