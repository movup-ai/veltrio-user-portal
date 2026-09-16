import type { Vehicle } from '../types/vehicle.types'

export type DayState = 'booked' | 'available' | 'disabled'

export interface AvailabilityDay {
  date: Date
  state: DayState
  isToday: boolean
}

const DAYS_AHEAD = 14

/**
 * Mock 14-day availability until a bookings API exists. Derived deterministically from the
 * vehicle's id (stable across renders, differs per vehicle) mixed with its utilization rate.
 * A vehicle that's in Maintenance/Out of service reads as disabled for its near-term days —
 * it can't be booked regardless of what utilization alone would suggest.
 */
export function availabilityForVehicle(vehicle: Vehicle, from = new Date()): AvailabilityDay[] {
  const seed = [...vehicle.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())

  return Array.from({ length: DAYS_AHEAD }, (_, offset) => {
    const date = new Date(start)
    date.setDate(start.getDate() + offset)

    // Cheap deterministic hash → 0..99, compared against the vehicle's utilization.
    const roll = ((seed * 31 + offset * 17) % 100) / 100
    let state: DayState
    if (vehicle.status === 'Out of service') state = 'disabled'
    else if (vehicle.status === 'Maintenance') state = offset < 4 ? 'disabled' : roll < vehicle.utilization ? 'booked' : 'available'
    else state = roll < vehicle.utilization ? 'booked' : 'available'

    return { date, state, isToday: offset === 0 }
  })
}

export function nextAvailableDay(days: AvailabilityDay[]): AvailabilityDay | undefined {
  return days.find((d) => d.state === 'available')
}
