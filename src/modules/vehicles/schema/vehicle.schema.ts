import type { TFunction } from 'i18next'
import { z } from 'zod'
import { translateDurationUnit } from '@/i18n/domain'
import {
  BILLING_BASES,
  DURATION_UNITS,
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_CLASSES,
  VEHICLE_FEATURES,
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

const MAX_PHOTOS = 10

type ValidationT = TFunction<'validation'>

export function rateOptionSchema(t: ValidationT) {
  return z
    .object({
      id: z.string(),
      label: z.string().min(1, t('rateOption.labelRequired')).max(40),
      basis: z.enum(BILLING_BASES, { message: t('rateOption.basisRequired') }),
      rate: z.number({ message: t('rateOption.rateRequired') }).positive(t('rateOption.ratePositive')),
      blockDuration: optionalNumber,
      blockDurationUnit: z.enum(DURATION_UNITS).optional(),
      includedMiles: optionalNumber,
      unlimitedMileage: z.boolean(),
    })
    .superRefine((option, ctx) => {
      if (option.basis !== 'fixed') return

      if (option.blockDuration == null || option.blockDuration <= 0) {
        ctx.addIssue({ code: 'custom', path: ['blockDuration'], message: t('rateOption.durationRequired') })
        return
      }
      const unit = option.blockDurationUnit ?? 'days'
      const max = MAX_BLOCK_DURATION[unit]
      if (!Number.isInteger(option.blockDuration) || option.blockDuration > max) {
        ctx.addIssue({
          code: 'custom',
          path: ['blockDuration'],
          message: t('rateOption.durationRange', { max, unit: translateDurationUnit(unit, max) }),
        })
      }
    })
}

/**
 * Built as a factory rather than a module-level constant so every message resolves in the
 * language that is active when the form mounts — callers memoize it on `i18n.language`.
 */
export function vehicleFormSchema(t: ValidationT) {
  return z.object({
    // Step 1 — Vehicle details
    make: z.string().min(1, t('vehicle.makeRequired')).max(40),
    model: z.string().min(1, t('vehicle.modelRequired')).max(40),
    year: z
      .number({ message: t('vehicle.yearInvalid') })
      .int()
      .min(1990, t('vehicle.yearTooEarly'))
      .max(new Date().getFullYear() + 1, t('vehicle.yearTooLate')),
    class: z.enum(VEHICLE_CLASSES, { message: t('vehicle.classRequired') }),
    color: z.string().min(1, t('vehicle.colorRequired')).max(30),
    plate: z
      .string()
      .min(1, t('vehicle.plateRequired'))
      .max(15)
      .regex(/^[A-Za-z0-9·\-\s]+$/, t('vehicle.plateInvalid')),
    vin: z.string().min(11, t('vehicle.vinTooShort')).max(20, t('vehicle.vinTooLong')),
    location: z.string().min(1, t('vehicle.locationRequired')),
    status: z.enum(VEHICLE_STATUSES, { message: t('vehicle.statusRequired') }),
    mileage: z.number({ message: t('vehicle.mileageRequired') }).int().min(0, t('vehicle.mileageNegative')),
    transmission: z.enum(TRANSMISSIONS, { message: t('vehicle.transmissionRequired') }),
    fuelType: z.enum(FUEL_TYPES, { message: t('vehicle.fuelTypeRequired') }),
    seats: z.number({ message: t('vehicle.seatsRequired') }).int().min(1).max(15),
    doors: z.number({ message: t('vehicle.doorsRequired') }).int().min(1).max(6),
    features: z.array(z.enum(VEHICLE_FEATURES)),
    description: z.string().max(600).optional().or(z.literal('')),

    // Step 2 — Photos
    photos: z.array(vehiclePhotoSchema).max(MAX_PHOTOS, t('vehicle.photosMax', { max: MAX_PHOTOS })),

    // Step 3 — Pricing
    rateOptions: z.array(rateOptionSchema(t)).min(1, t('vehicle.rateOptionsMin')),
    deposit: z.number({ message: t('vehicle.depositRequired') }).nonnegative(t('vehicle.depositRequired')),
    overageRatePerMile: z
      .number({ message: t('vehicle.overageRateRequired') })
      .nonnegative(t('vehicle.overageRateRequired')),
    fuelChargeRate: optionalNumber,
    taxRatePct: z.number().min(0).max(100).optional().or(z.nan().transform(() => undefined)),
  })
}

export type VehicleFormValues = z.infer<ReturnType<typeof vehicleFormSchema>>
export type RateOptionValues = z.infer<ReturnType<typeof rateOptionSchema>>

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
    'features',
    'description',
  ],
  photos: ['photos'],
  pricing: ['rateOptions', 'deposit', 'overageRatePerMile', 'fuelChargeRate', 'taxRatePct'],
  review: [],
} as const satisfies Record<string, (keyof VehicleFormValues)[]>
