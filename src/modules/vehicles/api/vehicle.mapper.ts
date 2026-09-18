import { toLimitOffset } from '@/lib/pagination'
import {
  type BillingBasis,
  type DurationUnit,
  type FuelType,
  type PhotoSize,
  type PhotoStatus,
  type PhotoVariant,
  type RateOption,
  type Transmission,
  type Vehicle,
  type VehicleFeature,
  type VehicleInput,
  type VehicleListParams,
  type VehiclePhoto,
  type VehicleSort,
  type VehicleStatus,
  type VehicleType,
} from '../types/vehicle.types'

/**
 * Translation layer between the portal's domain types and the FastAPI wire format.
 *
 * Four differences would otherwise leak into components:
 *   - enums — the portal uses canonical English ('On rent') as i18n keys, the API uses slugs ('on_rent')
 *   - money — the API stores integer cents, the portal works in dollars
 *   - utilization — the API reports a 0-100 percentage, the portal a 0-1 fraction
 *   - photos — the API returns pre-rendered variants, the portal renders one url plus a srcSet
 *
 * `isDraft` is not part of this translation. A part-filled wizard is not a vehicle (it has no VIN,
 * plate or specs), so the API keeps drafts in their own resource — see vehicle-draft.api.ts. The
 * flag survives on Vehicle only as a client-side marker for rendering the Drafts tab.
 */

// --- Wire types (mirror of the API's VehicleRead; see its /openapi.json) --------------------

export interface PhotoVariantWire {
  size: PhotoSize
  width: number
  height: number
  url: string
}

export interface VehiclePhotoWire {
  id: string
  name: string
  status: PhotoStatus
  width: number | null
  height: number | null
  /** Empty until status is 'ready'. */
  variants: PhotoVariantWire[]
  createdAt: string
}

export interface RateOptionWire {
  id: string
  label: string
  basis: BillingBasis
  rateCents: number
  blockDuration: number | null
  blockDurationUnit: DurationUnit | null
  includedMiles: number | null
  unlimitedMileage: boolean
}

export interface VehicleWire {
  id: string
  make: string
  model: string
  year: number
  vehicleType: string
  color: string
  plate: string
  vin: string
  location: string
  status: string
  mileage: number
  /** Percentage, 0-100. */
  utilization: number
  description: string | null
  notes: string | null
  photos: VehiclePhotoWire[]
  rateOptions: RateOptionWire[]
  fees: {
    depositCents: number | null
    overageRatePerMileCents: number | null
    fuelChargeRateCents: number | null
    taxRatePct: number | null
  }
  specs: {
    transmission: string
    fuelType: string
    seats: number
    doors: number
  }
  createdAt: string
  updatedAt: string
  features: string[]
}

// --- Enum translation ----------------------------------------------------------------------

// `satisfies` keeps these exhaustive: adding a portal value without its slug is a type error.
const STATUS_TO_API = {
  Available: 'available',
  'On rent': 'on_rent',
  Maintenance: 'maintenance',
  'Out of service': 'out_of_service',
} as const satisfies Record<VehicleStatus, string>

const TYPE_TO_API = {
  Convertible: 'convertible',
  Coupe: 'coupe',
  Crossover: 'crossover',
  Hatchback: 'hatchback',
  Minivan: 'minivan',
  'Pickup-truck': 'pickup_truck',
  Sedan: 'sedan',
  Sport: 'sport',
  SUV: 'suv',
  Van: 'van',
  Wagon: 'wagon',
} as const satisfies Record<VehicleType, string>

const TRANSMISSION_TO_API = {
  Automatic: 'automatic',
  Manual: 'manual',
} as const satisfies Record<Transmission, string>

const FUEL_TO_API = {
  Petrol: 'petrol',
  Diesel: 'diesel',
  Hybrid: 'hybrid',
  Electric: 'electric',
} as const satisfies Record<FuelType, string>

const SORT_TO_API = {
  utilization: 'utilization',
  dailyRate: 'daily_rate',
  name: 'name',
} as const satisfies Record<VehicleSort, string>

// The portal's feature keys are camelCase because they double as i18n keys; slugs follow the
// snake_case convention every other API enum uses.
const FEATURE_TO_API = {
  airConditioning: 'air_conditioning',
  gpsNavigation: 'gps_navigation',
  bluetoothAudio: 'bluetooth_audio',
  usbCharging: 'usb_charging',
  sunroof: 'sunroof',
  driverAssist: 'driver_assist',
  appleCarPlay: 'apple_car_play',
  rearViewCamera: 'rear_view_camera',
} as const satisfies Record<VehicleFeature, string>

function invert<P extends string>(map: Record<P, string>): Record<string, P> {
  return Object.fromEntries(Object.entries(map).map(([portal, slug]) => [slug, portal])) as Record<string, P>
}

const STATUS_FROM_API = invert(STATUS_TO_API)
const TYPE_FROM_API = invert(TYPE_TO_API)
const TRANSMISSION_FROM_API = invert(TRANSMISSION_TO_API)
const FUEL_FROM_API = invert(FUEL_TO_API)
const FEATURE_FROM_API = invert(FEATURE_TO_API)

/**
 * An unrecognized slug falls back rather than throwing: a value added to the API before the
 * portal knows it should render as something, not blank the whole list.
 */
function decode<P extends string>(map: Record<string, P>, slug: string, fallback: P): P {
  return map[slug] ?? fallback
}

// --- Money ---------------------------------------------------------------------------------

/** The API stores integer cents; the portal edits dollars. */
function toCents(dollars: number | undefined): number | null {
  return dollars == null ? null : Math.round(dollars * 100)
}

function fromCents(cents: number | null | undefined): number | undefined {
  return cents == null ? undefined : cents / 100
}

// --- Reads ---------------------------------------------------------------------------------

/** The size used for a single <img src>; the rest go in the srcSet. */
const PRIMARY_VARIANT: PhotoSize = 'medium'

function toPhoto(wire: VehiclePhotoWire): VehiclePhoto {
  const variants: PhotoVariant[] = wire.variants.map((v) => ({
    size: v.size,
    width: v.width,
    height: v.height,
    url: v.url,
  }))
  // Still processing → no variants yet, so no url. Callers render a placeholder for those.
  const primary = variants.find((v) => v.size === PRIMARY_VARIANT) ?? variants.at(-1)

  return {
    id: wire.id,
    name: wire.name,
    url: primary?.url ?? '',
    variants: variants.length > 0 ? variants : undefined,
    width: wire.width ?? undefined,
    height: wire.height ?? undefined,
    status: wire.status,
  }
}

function toRateOption(wire: RateOptionWire): RateOption {
  return {
    id: wire.id,
    label: wire.label,
    basis: wire.basis,
    rate: fromCents(wire.rateCents) ?? 0,
    blockDuration: wire.blockDuration ?? undefined,
    blockDurationUnit: wire.blockDurationUnit ?? undefined,
    includedMiles: wire.includedMiles ?? undefined,
    unlimitedMileage: wire.unlimitedMileage,
  }
}

export function toVehicle(wire: VehicleWire): Vehicle {
  return {
    id: wire.id,
    make: wire.make,
    model: wire.model,
    year: wire.year,
    vehicleType: decode(TYPE_FROM_API, wire.vehicleType, 'Sedan'),
    color: wire.color,
    plate: wire.plate,
    vin: wire.vin,
    location: wire.location,
    status: decode(STATUS_FROM_API, wire.status, 'Available'),
    mileage: wire.mileage,
    utilization: wire.utilization / 100,
    description: wire.description ?? undefined,
    notes: wire.notes ?? undefined,
    photos: wire.photos.map(toPhoto),
    rateOptions: wire.rateOptions.map(toRateOption),
    fees: {
      deposit: fromCents(wire.fees.depositCents),
      overageRatePerMile: fromCents(wire.fees.overageRatePerMileCents),
      fuelChargeRate: fromCents(wire.fees.fuelChargeRateCents),
      taxRatePct: wire.fees.taxRatePct ?? undefined,
    },
    specs: {
      transmission: decode(TRANSMISSION_FROM_API, wire.specs.transmission, 'Automatic'),
      fuelType: decode(FUEL_FROM_API, wire.specs.fuelType, 'Petrol'),
      seats: wire.specs.seats,
      doors: wire.specs.doors,
    },
    // An unknown slug is dropped rather than rendered raw — it has no label to translate.
    features: (wire.features ?? []).map((slug) => FEATURE_FROM_API[slug]).filter(Boolean),
    createdAt: wire.createdAt,
  }
}

// --- Writes --------------------------------------------------------------------------------

function toRateOptionPayload(option: RateOption) {
  // `id` is deliberately omitted. The API rejects it on create, and on update an id it doesn't
  // recognize is a 422 — the editor mints client-side UUIDs for new rows that are indistinguishable
  // from server ids, so the only safe choice is to let the API replace the set wholesale. The cost
  // is that option ids churn on every save; revisit when bookings start referencing them.
  return {
    label: option.label,
    basis: option.basis,
    rateCents: toCents(option.rate) ?? 0,
    blockDuration: option.blockDuration ?? null,
    blockDurationUnit: option.blockDurationUnit ?? null,
    includedMiles: option.includedMiles ?? null,
    unlimitedMileage: option.unlimitedMileage,
  }
}

/**
 * Body for both POST and PATCH — the wizard always submits every field, and the API replaces
 * `specs`, `fees` and `rateOptions` wholesale when present, so a full body means the same thing
 * either way. `photos` is never sent: it is server-managed through the photo endpoints.
 */
export function toVehiclePayload(input: VehicleInput) {
  return {
    // PATCH leaves an omitted key alone, so a field the wizard never edits must not be sent as
    // null — `notes` is only ever set by carrying an existing vehicle back through update.
    ...(input.notes !== undefined && { notes: input.notes.trim() || null }),
    make: input.make,
    model: input.model,
    year: input.year,
    vehicleType: TYPE_TO_API[input.vehicleType],
    color: input.color,
    plate: input.plate,
    vin: input.vin,
    location: input.location,
    status: STATUS_TO_API[input.status],
    mileage: input.mileage,
    description: input.description?.trim() || null,
    rateOptions: input.rateOptions.map(toRateOptionPayload),
    fees: {
      depositCents: toCents(input.fees.deposit),
      overageRatePerMileCents: toCents(input.fees.overageRatePerMile),
      fuelChargeRateCents: toCents(input.fees.fuelChargeRate),
      taxRatePct: input.fees.taxRatePct ?? null,
    },
    specs: {
      transmission: TRANSMISSION_TO_API[input.specs.transmission],
      fuelType: FUEL_TO_API[input.specs.fuelType],
      seats: input.specs.seats,
      doors: input.specs.doors,
    },
    features: input.features.map((feature) => FEATURE_TO_API[feature]),
  }
}

// --- Query ---------------------------------------------------------------------------------

/**
 * Filter params to a query the API accepts. The portal's "no filter" sentinels ('Any' / 'All')
 * are not valid enum values — sending them is a 422 — so they are dropped rather than translated.
 * Arrays are serialized as repeated keys (`?priceBand=0-50&priceBand=200+`) by the client's
 * paramsSerializer.
 */
export function toListQuery(params: VehicleListParams): Record<string, unknown> {
  const query: Record<string, unknown> = { ...toLimitOffset({ page: params.page, pageSize: params.pageSize }) }

  const search = params.search?.trim()
  if (search) query.search = search
  if (params.status && params.status !== 'Any') query.status = STATUS_TO_API[params.status]
  if (params.location && params.location !== 'All') query.location = params.location
  if (params.vehicleType && params.vehicleType !== 'All') query.vehicleType = TYPE_TO_API[params.vehicleType]
  if (params.transmission && params.transmission !== 'Any') query.transmission = TRANSMISSION_TO_API[params.transmission]
  if (params.fuelType && params.fuelType !== 'Any') query.fuelType = FUEL_TO_API[params.fuelType]
  if (params.priceBands && params.priceBands.length > 0) query.priceBand = params.priceBands
  if (params.sortBy) query.sortBy = SORT_TO_API[params.sortBy]

  return query
}

/** Same filters as the list, minus pagination — `GET /vehicles/stats` summarizes the whole match. */
export function toStatsQuery(params: VehicleListParams): Record<string, unknown> {
  const query = toListQuery(params)
  delete query.limit
  delete query.offset
  return query
}

export interface VehicleStatsWire {
  total: number
  byStatus: Record<string, number>
  avgDailyRateCents: number | null
  avgUtilization: number
}

/** Fleet summary in the portal's units — dollars, and utilization as a 0-1 fraction. */
export function toVehicleStats(wire: VehicleStatsWire) {
  return {
    total: wire.total,
    byStatus: Object.fromEntries(
      Object.entries(wire.byStatus).map(([slug, count]) => [decode(STATUS_FROM_API, slug, 'Available'), count]),
    ) as Record<VehicleStatus, number>,
    avgDailyRate: fromCents(wire.avgDailyRateCents),
    avgUtilization: wire.avgUtilization / 100,
  }
}
