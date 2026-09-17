import type { Vehicle } from '../types/vehicle.types'

export type DayState = 'booked' | 'available' | 'disabled'

export interface AvailabilityDay {
  date: Date
  state: DayState
  isToday: boolean
}

/**
 * A window the vehicle is spoken for, as ISO timestamps. Structural on purpose — the vehicles
 * module shouldn't need to know that these come from bookings.
 */
export interface BusyInterval {
  from: string
  to: string
}

const DAYS_AHEAD = 14

/** How long a vehicle entering maintenance is assumed to be off the road. */
const MAINTENANCE_DAYS = 4

const MS_PER_DAY = 24 * 60 * 60 * 1000

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * Day-by-day availability for the next two weeks, read off the vehicle's actual bookings.
 * A day counts as booked when any rental covers part of it. Status still wins: a vehicle in
 * maintenance or out of service can't be booked whatever the calendar says.
 */
export function availabilityForVehicle(vehicle: Vehicle, busy: BusyInterval[] = [], from = new Date()): AvailabilityDay[] {
  const start = startOfDay(from)

  // Parsed once rather than per day — 14 days x every interval adds up quickly on a big fleet.
  const windows = busy.map((i) => ({ from: Date.parse(i.from), to: Date.parse(i.to) }))

  return Array.from({ length: DAYS_AHEAD }, (_, offset) => {
    const date = new Date(start.getTime() + offset * MS_PER_DAY)
    const dayStart = date.getTime()
    const dayEnd = dayStart + MS_PER_DAY

    let state: DayState
    if (vehicle.status === 'Out of service') state = 'disabled'
    else if (vehicle.status === 'Maintenance' && offset < MAINTENANCE_DAYS) state = 'disabled'
    else state = windows.some((w) => w.from < dayEnd && dayStart < w.to) ? 'booked' : 'available'

    return { date, state, isToday: offset === 0 }
  })
}

export function nextAvailableDay(days: AvailabilityDay[]): AvailabilityDay | undefined {
  return days.find((d) => d.state === 'available')
}
