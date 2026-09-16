import i18n from '@/i18n'
import { ApiError } from '@/types/api'
import { FUEL_TYPES, TRANSMISSIONS, VEHICLE_CLASSES, type FuelType, type Transmission, type VehicleClass } from '../types/vehicle.types'
import { VEHICLE_MAKES, modelsForMake } from '../data/vehicle-catalog'

export interface VinDecodeResult {
  make?: string
  model?: string
  year?: number
  vehicleType?: VehicleClass
  transmission?: Transmission
  fuelType?: FuelType
  doors?: number
  cylinders?: number
  horsepower?: number
}

interface NhtsaResultRow {
  Variable: string
  Value: string | null
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/(\s|-)/)
    .map((part) => (part === ' ' || part === '-' ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('')
}

/** Matches a decoded value against our known catalog case-insensitively, falling back to a title-cased version of the raw value. */
function reconcile(value: string, knownOptions: string[]): string {
  const match = knownOptions.find((o) => o.toLowerCase() === value.toLowerCase())
  return match ?? titleCase(value)
}

function mapBodyClass(bodyClass: string): VehicleClass | undefined {
  const v = bodyClass.toLowerCase()
  if (v.includes('convertible') || v.includes('cabriolet')) return 'Convertible'
  if (v.includes('coupe')) return 'Coupe'
  if (v.includes('crossover')) return 'Crossover'
  if (v.includes('hatchback') || v.includes('liftback')) return 'Hatchback'
  if (v.includes('minivan')) return 'Minivan'
  if (v.includes('pickup') || v.includes('truck')) return 'Pickup-truck'
  if (v.includes('sedan') || v.includes('saloon')) return 'Sedan'
  if (v.includes('suv') || v.includes('sport utility')) return 'SUV'
  if (v.includes('van')) return 'Van'
  if (v.includes('wagon')) return 'Wagon'
  return VEHICLE_CLASSES.find((c) => v.includes(c.toLowerCase()))
}

function mapFuelType(fuel: string): FuelType | undefined {
  const v = fuel.toLowerCase()
  if (v.includes('electric')) return 'Electric'
  if (v.includes('hybrid')) return 'Hybrid'
  if (v.includes('diesel')) return 'Diesel'
  if (v.includes('gasoline') || v.includes('petrol') || v.includes('flexible')) return 'Petrol'
  return FUEL_TYPES.find((f) => v.includes(f.toLowerCase()))
}

function mapTransmission(style: string): Transmission | undefined {
  const v = style.toLowerCase()
  if (v.includes('manual')) return 'Manual'
  if (v.includes('automatic') || v.includes('cvt')) return 'Automatic'
  return TRANSMISSIONS.find((t) => v.includes(t.toLowerCase()))
}

function toNumber(value: string | null | undefined): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function fieldValue(rows: NhtsaResultRow[], variable: string): string | undefined {
  const row = rows.find((r) => r.Variable === variable)
  return row?.Value?.trim() || undefined
}

/**
 * Looks up a VIN against NHTSA's free, CORS-enabled vPIC decoder (no API key required).
 * Real US-market VINs only — returns whatever fields the registry has on file, which varies
 * by manufacturer/year, so callers should treat every field as optional.
 */
export async function decodeVin(vin: string): Promise<VinDecodeResult> {
  const trimmed = vin.trim().toUpperCase()
  if (trimmed.length < 11) {
    throw new ApiError('validation', i18n.t('vehicles:errors.vinTooShort'))
  }

  let res: Response
  try {
    res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${encodeURIComponent(trimmed)}?format=json`)
  } catch (cause) {
    throw new ApiError('network_error', i18n.t('vehicles:errors.vinServiceUnreachable'), { cause })
  }
  if (!res.ok) {
    throw new ApiError('server_error', i18n.t('vehicles:errors.vinServiceUnavailable'), { status: res.status })
  }

  const body = (await res.json()) as { Results?: Array<Record<string, string | null>> }
  const row = body.Results?.[0]
  if (!row) {
    throw new ApiError('server_error', i18n.t('vehicles:errors.vinNoData'))
  }

  const rows: NhtsaResultRow[] = Object.entries(row).map(([Variable, Value]) => ({ Variable, Value }))
  const errorCode = fieldValue(rows, 'ErrorCode')
  if (errorCode && errorCode !== '0') {
    // NHTSA's own ErrorText is English-only; our fallback at least localizes the common case.
    const errorText = fieldValue(rows, 'ErrorText') ?? i18n.t('vehicles:errors.vinUndecodable')
    throw new ApiError('validation', errorText)
  }

  const rawMake = fieldValue(rows, 'Make')
  const rawModel = fieldValue(rows, 'Model')
  const make = rawMake ? reconcile(rawMake, VEHICLE_MAKES) : undefined
  const model = rawModel ? reconcile(rawModel, make ? modelsForMake(make) : []) : undefined

  const bodyClass = fieldValue(rows, 'BodyClass')
  const fuelType = fieldValue(rows, 'FuelTypePrimary')
  const transmission = fieldValue(rows, 'TransmissionStyle')

  return {
    make,
    model,
    year: toNumber(fieldValue(rows, 'ModelYear')),
    vehicleType: bodyClass ? mapBodyClass(bodyClass) : undefined,
    transmission: transmission ? mapTransmission(transmission) : undefined,
    fuelType: fuelType ? mapFuelType(fuelType) : undefined,
    doors: toNumber(fieldValue(rows, 'Doors')),
    cylinders: toNumber(fieldValue(rows, 'EngineCylinders')),
    horsepower: toNumber(fieldValue(rows, 'EngineHP')),
  }
}
