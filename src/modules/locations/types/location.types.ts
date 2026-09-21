export const LOCATION_STATUSES = ['Open', 'Closed'] as const
export type LocationStatus = (typeof LOCATION_STATUSES)[number]

export const OPENING_DAYS = ['monSun', 'monFri', 'monSat'] as const
export type OpeningDays = (typeof OPENING_DAYS)[number]

export interface Location {
  id: string
  name: string
  address: string
  status: LocationStatus
  openingDays: OpeningDays
  /** Minutes from midnight, so the range sorts and formats without a timezone. */
  opensAt: number
  closesAt: number
  /** Vehicles based here, counted by the API. Archived vehicles are excluded. */
  vehicleCount: number
}

export type LocationInput = Omit<Location, 'id' | 'vehicleCount'>
