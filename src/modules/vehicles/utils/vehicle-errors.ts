import type { UseFormSetError } from 'react-hook-form'
import i18n from '@/i18n'
import { ApiError } from '@/types/api'
import type { VehicleFormValues } from '../schema/vehicle.schema'

/**
 * Turns an API rejection into errors on the fields that caused it.
 *
 * Without this a failed publish is only a toast: the user is left on the Review step with every
 * field looking valid and no way to tell which one the server objected to. The two rejections
 * that actually happen in practice are a duplicate VIN and a Pydantic validation failure.
 */

/** Wire field names that differ from the form's, so `loc` can be pointed at the right control. */
const FIELD_ALIASES: Record<string, keyof VehicleFormValues> = {
  vehicleType: 'vehicleType',
  transmission: 'transmission',
  fuelType: 'fuelType',
  seats: 'seats',
  doors: 'doors',
  rateCents: 'rateOptions',
  depositCents: 'deposit',
  overageRatePerMileCents: 'overageRatePerMile',
  fuelChargeRateCents: 'fuelChargeRate',
  taxRatePct: 'taxRatePct',
}

const FORM_FIELDS = new Set<string>([
  'make',
  'model',
  'year',
  'vehicleType',
  'color',
  'plate',
  'vin',
  'location',
  'status',
  'mileage',
  'transmission',
  'fuelType',
  'seats',
  'doors',
  'features',
  'description',
  'photos',
  'rateOptions',
  'deposit',
  'overageRatePerMile',
  'fuelChargeRate',
  'taxRatePct',
])

function toFormField(field: string): keyof VehicleFormValues | undefined {
  const mapped = FIELD_ALIASES[field] ?? field
  return FORM_FIELDS.has(mapped) ? (mapped as keyof VehicleFormValues) : undefined
}

/** The wizard step each field lives on, so a rejection can send the user back to it. */
const STEP_OF_FIELD: Record<string, number> = {
  make: 0,
  model: 0,
  year: 0,
  vehicleType: 0,
  color: 0,
  plate: 0,
  vin: 0,
  location: 0,
  status: 0,
  mileage: 0,
  transmission: 0,
  fuelType: 0,
  seats: 0,
  doors: 0,
  features: 0,
  description: 0,
  photos: 1,
  rateOptions: 2,
  deposit: 2,
  overageRatePerMile: 2,
  fuelChargeRate: 2,
  taxRatePct: 2,
}

export interface AppliedVehicleError {
  /** Step holding the first rejected field, for sending the user back to fix it. */
  step?: number
  /** Message for the toast, when nothing could be attached to a field. */
  message: string
  /** True when at least one error landed on a form field. */
  handled: boolean
}

export function applyVehicleApiError(
  error: unknown,
  setError: UseFormSetError<VehicleFormValues>,
): AppliedVehicleError {
  const apiError = error instanceof ApiError ? error : undefined
  if (!apiError) {
    return { message: i18n.t('validation:api.unknown'), handled: false }
  }

  // A duplicate VIN is a 409 with no field breakdown, but we know exactly which input it means.
  if (apiError.code === 'vin_already_exists') {
    setError('vin', { message: i18n.t('vehicles:errors.vinAlreadyExists') })
    return { step: STEP_OF_FIELD.vin, message: apiError.message, handled: true }
  }

  let firstStep: number | undefined
  let handled = false

  for (const fieldError of apiError.fieldErrors ?? []) {
    const field = toFormField(fieldError.field)
    if (!field) continue
    setError(field, { message: fieldError.message })
    handled = true
    const step = STEP_OF_FIELD[field]
    if (step !== undefined && (firstStep === undefined || step < firstStep)) firstStep = step
  }

  return { step: firstStep, message: apiError.message, handled }
}
