import type { TFunction } from 'i18next'
import { z } from 'zod'
import { translateDurationUnit } from '@/i18n/domain'
import { MAX_DISCOUNT_TIERS } from '../constants/rate-plan.constants'
import {
  BILLING_BASES,
  DURATION_UNITS,
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_TYPES,
  VEHICLE_FEATURES,
  SELECTABLE_VEHICLE_STATUSES,
} from '../types/vehicle.types'

const optionalNumber = z.number().nonnegative().optional().or(z.nan().transform(() => undefined))

export const vehiclePhotoSchema = z.object({
  id: z.string(),
  url: z.string(),
  name: z.string(),
  /** Present only for a photo picked in this session, until it has been uploaded. */
  file: z.instanceof(File).optional(),
})

/** Max block duration per unit — keeps "3 months" valid but rejects "400 hours". */
const MAX_BLOCK_DURATION: Record<(typeof DURATION_UNITS)[number], number> = {
  hours: 24,
  days: 365,
  weeks: 52,
  months: 12,
}

/** Matches MAX_PHOTOS_PER_VEHICLE on the API, which rejects anything beyond it. */
const MAX_PHOTOS = 20

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

/** Bounds match DiscountTier on the API, which rejects anything outside them. */
function discountTierSchema(t: ValidationT) {
  return z.object({
    id: z.string(),
    minDays: z
      .number({ message: t('discountTier.daysRange') })
      .int(t('discountTier.daysRange'))
      .min(1, t('discountTier.daysRange'))
      .max(365, t('discountTier.daysRange')),
    percentOff: z
      .number({ message: t('discountTier.percentRange') })
      .int(t('discountTier.percentRange'))
      .min(1, t('discountTier.percentRange'))
      .max(99, t('discountTier.percentRange')),
  })
}

function discountTiersSchema(t: ValidationT) {
  return z
    .array(discountTierSchema(t))
    .max(MAX_DISCOUNT_TIERS)
    .superRefine((tiers, ctx) => {
      tiers.forEach((tier, index) => {
        if (tiers.findIndex((other) => other.minDays === tier.minDays) === index) return
        ctx.addIssue({
          code: 'custom',
          path: [index, 'minDays'],
          message: t('discountTier.daysDuplicate', { days: tier.minDays }),
        })
      })
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
      .min(1900, t('vehicle.yearTooEarly'))
      .max(new Date().getFullYear() + 1, t('vehicle.yearTooLate')),
    vehicleType: z.enum(VEHICLE_TYPES, { message: t('vehicle.vehicleTypeRequired') }),
    color: z.string().min(1, t('vehicle.colorRequired')).max(30),
    plate: z
      .string()
      .min(1, t('vehicle.plateRequired'))
      .max(15)
      .regex(/^[A-Za-z0-9·\-\s]+$/, t('vehicle.plateInvalid')),
    vin: z.string().min(11, t('vehicle.vinTooShort')).max(20, t('vehicle.vinTooLong')),
    location: z.string().min(1, t('vehicle.locationRequired')),
    status: z.enum(SELECTABLE_VEHICLE_STATUSES, { message: t('vehicle.statusRequired') }),
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
    discountTiers: discountTiersSchema(t),
    billableHoursPerDay: z
      .number({ message: t('vehicle.billableHoursRange') })
      .int(t('vehicle.billableHoursRange'))
      .min(1, t('vehicle.billableHoursRange'))
      .max(24, t('vehicle.billableHoursRange')),
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
export type DiscountTierValues = z.infer<ReturnType<typeof discountTierSchema>>

export const STEP_FIELDS = {
  details: [
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
  ],
  photos: ['photos'],
  pricing: ['rateOptions', 'discountTiers', 'billableHoursPerDay', 'deposit', 'overageRatePerMile', 'fuelChargeRate', 'taxRatePct'],
  review: [],
} as const satisfies Record<string, (keyof VehicleFormValues)[]>
