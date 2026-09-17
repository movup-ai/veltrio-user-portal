export const VEHICLE_STATUSES = ['Available', 'On rent', 'Maintenance', 'Out of service'] as const
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number]

export const VEHICLE_TYPES = [
  'Convertible',
  'Coupe',
  'Crossover',
  'Hatchback',
  'Minivan',
  'Pickup-truck',
  'Sedan',
  'Sport',
  'SUV',
  'Van',
  'Wagon',
] as const
export type VehicleType = (typeof VEHICLE_TYPES)[number]

export const TRANSMISSIONS = ['Automatic', 'Manual'] as const
export type Transmission = (typeof TRANSMISSIONS)[number]

export const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric'] as const
export type FuelType = (typeof FUEL_TYPES)[number]

/** How a rate option is billed. 'fixed' is a flat price for a set block (e.g. a 3-day weekend package). */
export const BILLING_BASES = ['hour', 'day', 'week', 'month', 'fixed'] as const
export type BillingBasis = (typeof BILLING_BASES)[number]

/** Unit for a fixed-length block's duration. */
export const DURATION_UNITS = ['hours', 'days', 'weeks', 'months'] as const
export type DurationUnit = (typeof DURATION_UNITS)[number]

/**
 * One way a renter can book this vehicle — "Daily · $400 · 200 mi included",
 * "Weekend Package · fixed 3 days · $1,500 · unlimited miles", etc.
 * A vehicle needs at least one to be bookable.
 */
export interface RateOption {
  id: string
  label: string
  basis: BillingBasis
  rate: number
  /** Required when basis === 'fixed'. */
  blockDuration?: number
  blockDurationUnit?: DurationUnit
  /** Miles included per billing unit. Ignored when unlimitedMileage is true. */
  includedMiles?: number
  unlimitedMileage: boolean
}

export interface VehiclePhoto {
  id: string
  /** Object URL (mock) or CDN URL (real backend). */
  url: string
  name: string
}

/** Per-vehicle charges that apply regardless of which rate option the renter picks. */
export interface VehicleFees {
  deposit?: number
  overageRatePerMile?: number
  fuelChargeRate?: number
  taxRatePct?: number
}

export interface VehicleSpecs {
  transmission: Transmission
  fuelType: FuelType
  seats: number
  doors: number
}

/** Renter-facing amenities, surfaced on the listing. Canonical keys — labels live in `vehicles:features`. */
export const VEHICLE_FEATURES = [
  'airConditioning',
  'gpsNavigation',
  'bluetoothAudio',
  'usbCharging',
  'sunroof',
  'driverAssist',
  'appleCarPlay',
  'rearViewCamera',
] as const
export type VehicleFeature = (typeof VEHICLE_FEATURES)[number]

export interface Vehicle {
  id: string
  make: string
  model: string
  year: number
  vehicleType: VehicleType
  color: string
  plate: string
  vin: string
  location: string
  status: VehicleStatus
  mileage: number
  utilization: number
  description?: string
  notes?: string
  photos: VehiclePhoto[]
  rateOptions: RateOption[]
  fees: VehicleFees
  specs: VehicleSpecs
  features: VehicleFeature[]
  createdAt: string
  /** Saved via "Save & exit" mid-wizard — not yet published to the live fleet. Independent of `status`. */
  isDraft?: boolean
}

/** Payload shape for create/update — server assigns id/createdAt/utilization. */
export type VehicleInput = Omit<Vehicle, 'id' | 'createdAt' | 'utilization'>

export const VEHICLE_SORTS = ['utilization', 'dailyRate', 'name'] as const
export type VehicleSort = (typeof VEHICLE_SORTS)[number]

/** Bounds only — the display label lives in `vehicles:filters.priceBand.<value>`. */
export const VEHICLE_PRICE_BANDS = [
  { value: '0-50', min: 0, max: 50 },
  { value: '50-100', min: 50, max: 100 },
  { value: '100-200', min: 100, max: 200 },
  { value: '200+', min: 200, max: Infinity },
] as const
export type VehiclePriceBand = (typeof VEHICLE_PRICE_BANDS)[number]['value']

export interface VehicleListParams {
  search?: string
  status?: VehicleStatus | 'Any'
  location?: string | 'All'
  vehicleType?: VehicleType | 'All'
  transmission?: Transmission | 'Any'
  fuelType?: FuelType | 'Any'
  priceBands?: VehiclePriceBand[]
  /** true = only drafts, false = only published vehicles, omitted = both. */
  isDraft?: boolean
  sortBy?: VehicleSort
  page: number
  pageSize: number
}
