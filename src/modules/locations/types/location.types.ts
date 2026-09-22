/**
 * How a listing is ordered. The page shows newest first so a branch just added is easy to
 * spot; pickers stay alphabetical, where the branch being looked for is already known.
 */
export const LOCATION_SORTS = ['newest', 'name'] as const
export type LocationSort = (typeof LOCATION_SORTS)[number]

export const LOCATION_STATUSES = ['Open', 'Closed'] as const
export type LocationStatus = (typeof LOCATION_STATUSES)[number]

export const OPENING_DAYS = ['monSun', 'monFri', 'monSat'] as const
export type OpeningDays = (typeof OPENING_DAYS)[number]

/**
 * The parts of a picked address, kept alongside the formatted line so a branch can be grouped
 * or searched without parsing it back apart. All optional: an address typed by hand, or one
 * saved before the picker existed, has the formatted line only.
 */
export interface AddressPin {
  street?: string
  city?: string
  state?: string
  postalCode?: string
  /** ISO 3166-1 alpha-2, upper case. */
  country?: string
  /** Set together or not at all. */
  latitude?: number
  longitude?: number
}

export interface Location extends AddressPin {
  id: string
  name: string
  /** The formatted one-line address, as displayed and used as a booking's pickup address. */
  address: string
  status: LocationStatus
  openingDays: OpeningDays
  /** Minutes from midnight, so the range sorts and formats without a timezone. */
  opensAt: number
  closesAt: number
  /** Preselected wherever a branch is picked. Exactly one per tenant. */
  isDefault: boolean
  /**
   * The address this branch was originally identified by. Kept alongside `address`, which is
   * free to be edited for display, so the original stays available.
   */
  originalAddress?: string
  /** Vehicles based here, counted by the API. Archived vehicles are excluded. */
  vehicleCount: number
}

export type LocationInput = Omit<Location, 'id' | 'vehicleCount'>
