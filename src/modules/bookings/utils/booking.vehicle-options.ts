import type { Vehicle } from '@/modules/vehicles/types/vehicle.types'
import { vehicleDisplayName, vehicleSubtitle } from '@/modules/vehicles/utils/vehicle.utils'

interface Listed {
  vehicle: Vehicle
  bookedUntil?: string
  outOn?: string
}

/** Held on the trip's dates: listed for what it says, not to be picked. */
export function isTaken(option: Listed): boolean {
  return Boolean(option.bookedUntil || option.outOn)
}

/** Letters and digits alone, unaccented: a plate is typed "8kj205" and a branch "cancun". */
function plain(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
}

/**
 * The cars a search leaves, those that can be picked first. Every word typed has to be found,
 * in the name, the plate, the branch or the type: cars of one model tell apart only by plate.
 */
export function searchVehicleOptions<T extends Listed>(options: T[], query: string): T[] {
  const words = query.split(/\s+/).map(plain).filter(Boolean)
  const found = options.filter(({ vehicle }) => {
    const text = plain(
      [vehicleDisplayName(vehicle), vehicle.plate, vehicle.location, vehicleSubtitle(vehicle)].join(' '),
    )
    return words.every((word) => text.includes(word))
  })
  return [...found].sort((a, b) => Number(isTaken(a)) - Number(isTaken(b)))
}
