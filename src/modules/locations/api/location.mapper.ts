import type {
  Location,
  LocationInput,
  LocationStatus,
  OpeningDays,
} from '../types/location.types'

/**
 * Translation layer between the portal's domain types and the FastAPI wire format.
 *
 * The portal uses canonical English ('Open', 'monSun') as i18n keys; the API uses slugs
 * ('open', 'mon_sun'). Opening hours stay as minutes from midnight on both sides — they are
 * formatted for display, never stored as text.
 */

export interface LocationWire {
  id: string
  name: string
  address: string
  street: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  isDefault: boolean
  originalAddress: string | null
  status: string
  openingDays: string
  opensAt: number
  closesAt: number
  vehicleCount: number
}

const STATUS_TO_API = {
  Open: 'open',
  Closed: 'closed',
} as const satisfies Record<LocationStatus, string>

const DAYS_TO_API = {
  monSun: 'mon_sun',
  monFri: 'mon_fri',
  monSat: 'mon_sat',
} as const satisfies Record<OpeningDays, string>

function invert<P extends string>(map: Record<P, string>): Record<string, P> {
  return Object.fromEntries(Object.entries(map).map(([portal, slug]) => [slug, portal])) as Record<string, P>
}

const STATUS_FROM_API = invert(STATUS_TO_API)
const DAYS_FROM_API = invert(DAYS_TO_API)

/** An unrecognized slug falls back rather than throwing, as in the vehicles mapper. */
function decode<P extends string>(map: Record<string, P>, slug: string, fallback: P): P {
  return map[slug] ?? fallback
}

/** The API sends null for an absent part; the portal's types use optional. */
function optional<T>(value: T | null): T | undefined {
  return value ?? undefined
}

export function toLocation(wire: LocationWire): Location {
  return {
    id: wire.id,
    name: wire.name,
    address: wire.address,
    street: optional(wire.street),
    city: optional(wire.city),
    state: optional(wire.state),
    postalCode: optional(wire.postalCode),
    country: optional(wire.country),
    latitude: optional(wire.latitude),
    longitude: optional(wire.longitude),
    isDefault: wire.isDefault,
    originalAddress: optional(wire.originalAddress),
    status: decode(STATUS_FROM_API, wire.status, 'Open'),
    openingDays: decode(DAYS_FROM_API, wire.openingDays, 'monSun'),
    opensAt: wire.opensAt,
    closesAt: wire.closesAt,
    vehicleCount: wire.vehicleCount,
  }
}

export function toLocationPayload(input: LocationInput) {
  return {
    name: input.name.trim(),
    address: input.address.trim(),
    // Omitted rather than sent as null: the API treats a missing part as unset, and a branch
    // whose address was retyped by hand should lose the pin it no longer matches.
    street: input.street?.trim() || undefined,
    city: input.city?.trim() || undefined,
    state: input.state?.trim() || undefined,
    postalCode: input.postalCode?.trim() || undefined,
    country: input.country?.trim() || undefined,
    latitude: input.latitude,
    longitude: input.longitude,
    isDefault: input.isDefault,
    originalAddress: input.originalAddress?.trim() || undefined,
    status: STATUS_TO_API[input.status],
    openingDays: DAYS_TO_API[input.openingDays],
    opensAt: input.opensAt,
    closesAt: input.closesAt,
  }
}
