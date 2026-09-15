import { z } from 'zod'
import {
  BILLING_BASES,
  DURATION_UNITS,
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_CLASSES,
  VEHICLE_STATUSES,
} from '../types/vehicle.types'

const optionalNumber = z.number().nonnegative().optional().or(z.nan().transform(() => undefined))

export const vehiclePhotoSchema = z.object({
  id: z.string(),
  url: z.string(),
  name: z.string(),
})

/** Max block duration per unit — keeps "3 months" valid but rejects "400 hours". */
const MAX_BLOCK_DURATION: Record<(typeof DURATION_UNITS)[number], number> = {
  hours: 24,
  days: 365,
  weeks: 52,
  months: 12,
}

export const rateOptionSchema = z
  .object({
    id: z.string(),
    label: z.string().min(1, 'Label is required').max(40),
    basis: z.enum(BILLING_BASES, { message: 'Pick a billing basis' }),
    rate: z.number({ message: 'Enter a rate' }).positive('Rate must be greater than 0'),
    blockDuration: optionalNumber,
    blockDurationUnit: z.enum(DURATION_UNITS).optional(),
    includedMiles: optionalNumber,
    unlimitedMileage: z.boolean(),
  })
  .superRefine((option, ctx) => {
    if (option.basis !== 'fixed') return

    if (option.blockDuration == null || option.blockDuration <= 0) {
      ctx.addIssue({ code: 'custom', path: ['blockDuration'], message: 'Enter a block duration' })
      return
    }
    const unit = option.blockDurationUnit ?? 'days'
    const max = MAX_BLOCK_DURATION[unit]
    if (!Number.isInteger(option.blockDuration) || option.blockDuration > max) {
      ctx.addIssue({ code: 'custom', path: ['blockDuration'], message: `Must be a whole number, 1–${max} ${unit}` })
    }
  })

export const vehicleFormSchema = z.object({
  // Step 1 — Vehicle details
  make: z.string().min(1, 'Make is required').max(40),
  model: z.string().min(1, 'Model is required').max(40),
  year: z
    .number({ message: 'Enter a valid year' })
    .int()
    .min(1990, 'Year must be 1990 or later')
    .max(new Date().getFullYear() + 1, 'Year is too far in the future'),
  class: z.enum(VEHICLE_CLASSES, { message: 'Select a vehicle type' }),
  color: z.string().min(1, 'Color is required').max(30),
  plate: z
    .string()
    .min(1, 'Plate is required')
    .max(15)
    .regex(/^[A-Za-z0-9·\-\s]+$/, 'Plate contains invalid characters'),
  vin: z.string().min(11, 'VIN looks too short').max(20, 'VIN looks too long'),
  location: z.string().min(1, 'Select a location'),
  status: z.enum(VEHICLE_STATUSES, { message: 'Select a status' }),
  mileage: z.number({ message: 'Enter mileage' }).int().min(0, 'Mileage cannot be negative'),
  transmission: z.enum(TRANSMISSIONS, { message: 'Select a transmission' }),
  fuelType: z.enum(FUEL_TYPES, { message: 'Select a fuel type' }),
  seats: z.number({ message: 'Enter seat count' }).int().min(1).max(15),
  doors: z.number({ message: 'Enter door count' }).int().min(1).max(6),
  topSpeedMph: optionalNumber,
  horsepower: optionalNumber,
  zeroToSixtySec: optionalNumber,
  cylinders: optionalNumber,
  description: z.string().max(600).optional().or(z.literal('')),

  // Step 2 — Photos
  photos: z.array(vehiclePhotoSchema).max(10, 'You can upload up to 10 photos'),

  // Step 3 — Pricing
  rateOptions: z.array(rateOptionSchema).min(1, 'Add at least one rate option to make this vehicle bookable'),
  deposit: z.number({ message: 'Enter a security deposit' }).nonnegative('Enter a security deposit'),
  overageRatePerMile: z.number({ message: 'Enter an overage rate' }).nonnegative('Enter an overage rate'),
  fuelChargeRate: optionalNumber,
  taxRatePct: z.number().min(0).max(100).optional().or(z.nan().transform(() => undefined)),
})

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>
export type RateOptionValues = z.infer<typeof rateOptionSchema>

export const STEP_FIELDS = {
  details: [
    'make',
    'model',
    'year',
    'class',
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
    'topSpeedMph',
    'horsepower',
    'zeroToSixtySec',
    'cylinders',
    'description',
  ],
  photos: ['photos'],
  pricing: ['rateOptions', 'deposit', 'overageRatePerMile', 'fuelChargeRate', 'taxRatePct'],
  review: [],
} as const satisfies Record<string, (keyof VehicleFormValues)[]>
