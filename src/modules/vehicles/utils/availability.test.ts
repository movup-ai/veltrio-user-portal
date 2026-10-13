import { describe, expect, it } from 'vitest'
import type { Vehicle } from '../types/vehicle.types'
import { availabilityForVehicle, type BusyInterval } from './availability'

const TODAY = new Date(2026, 9, 13, 12)
const at = (day: number, hour = 10) => new Date(2026, 9, day, hour).toISOString()
const vehicle = (status: Vehicle['status'] = 'Available') => ({ id: 'v1', status }) as unknown as Vehicle

/** The 14 states as one letter each, so a whole strip reads at a glance. */
function strip(busy: BusyInterval[], status?: Vehicle['status']): string {
  return availabilityForVehicle(vehicle(status), busy, TODAY)
    .map((day) => day.state[0])
    .join('')
}

describe('availabilityForVehicle', () => {
  it('marks the days a held booking covers, part days included', () => {
    expect(strip([{ from: at(15), to: at(17) }])).toBe('aabbbaaaaaaaaa')
  })

  it('marks a request nobody has accepted yet as pending, not booked', () => {
    expect(strip([{ from: at(15), to: at(17), pending: true }])).toBe('aapppaaaaaaaaa')
  })

  it('lets a held booking win the days it shares with a request', () => {
    const busy = [
      { from: at(14), to: at(18), pending: true },
      { from: at(16), to: at(17) },
    ]
    expect(strip(busy)).toBe('appbbpaaaaaaaa')
  })

  it('shows a car that is off the road as disabled, whatever is booked', () => {
    expect(strip([{ from: at(15), to: at(17), pending: true }], 'Out of service')).toBe('dddddddddddddd')
  })
})
