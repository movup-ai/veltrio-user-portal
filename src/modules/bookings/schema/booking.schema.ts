import type { TFunction } from 'i18next'
import { z } from 'zod'
import { BOOKING_VERIFICATIONS } from '../types/booking.types'

type ValidationT = TFunction<'validation'>

/** `<input type="time">` always yields HH:MM (24h), independent of the displayed locale. */
const TIME_PATTERN = /^\d{2}:\d{2}$/

/** Combines the split date and time inputs into a local Date — the branch's wall clock is what matters. */
export function combineDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time || '00:00'}:00`)
}

/**
 * A file the counter has picked but not yet sent. It carries the real `File`, which is what
 * gets uploaded once the booking exists and the renter has a customer id to attach it to.
 */
const uploadedFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  size: z.number(),
  file: z.instanceof(File),
})

/** RHF's valueAsNumber yields NaN for a cleared numeric input — treat that as "not entered". */
const money = (message: string) =>
  z
    .number({ message })
    .nonnegative(message)
    .or(z.nan().transform(() => 0))

function additionalDriverSchema(t: ValidationT) {
  return z.object({
    id: z.string(),
    name: z.string().min(1, t('booking.driverNameRequired')).max(60),
    licenceNumber: z.string().min(1, t('booking.driverLicenceRequired')).max(30),
    pricePerDay: money(t('booking.driverRateInvalid')),
  })
}

function bookingFeeSchema(t: ValidationT) {
  return z.object({
    id: z.string(),
    label: z.string().min(1, t('booking.feeLabelRequired')).max(60),
    amount: money(t('booking.feeAmountInvalid')),
  })
}

/**
 * Built as a factory (like the vehicle schema) so every message resolves in the language
 * active when the form mounts — callers memoize it on `tValidation`.
 */
export function bookingFormSchema(t: ValidationT) {
  return z
    .object({
      // Step 1 — Trip
      pickupLocation: z.string().min(1, t('booking.pickupLocationRequired')),
      returnLocation: z.string().min(1, t('booking.returnLocationRequired')),
      pickupDate: z.string().min(1, t('booking.pickupDateRequired')),
      pickupTime: z.string().regex(TIME_PATTERN, t('booking.timeRequired')),
      returnDate: z.string().min(1, t('booking.returnDateRequired')),
      returnTime: z.string().regex(TIME_PATTERN, t('booking.timeRequired')),
      vehicleId: z.string().min(1, t('booking.vehicleRequired')),

      // Step 2 — Renter
      /** Set only while the name still matches someone picked from the customer book. */
      customerId: z.string(),
      customerName: z.string().min(1, t('booking.customerNameRequired')).max(60),
      customerEmail: z.email(t('booking.customerEmailInvalid')),
      customerPhone: z.string().min(6, t('booking.customerPhoneRequired')).max(25),
      // Optional on purpose — the branch can take these at handover rather than blocking the booking.
      customerDob: z.string(),
      customerAddress: z.string().max(160, t('booking.addressTooLong')),
      licenceNumber: z.string().min(1, t('booking.customerLicenceRequired')).max(30),
      licenceExpiry: z.string(),
      licenceDocument: uploadedFileSchema.nullable(),
      insuranceDocument: uploadedFileSchema.nullable(),
      verifications: z.array(z.enum(BOOKING_VERIFICATIONS)),
      additionalDrivers: z.array(additionalDriverSchema(t)),

      // Step 3 — Price
      rateOptionId: z.string().min(1, t('booking.rateOptionRequired')),
      fees: z.array(bookingFeeSchema(t)),
    })
    .superRefine((values, ctx) => {
      if (!values.pickupDate || !values.returnDate || !TIME_PATTERN.test(values.returnTime)) return

      const pickup = combineDateTime(values.pickupDate, values.pickupTime)
      const dropoff = combineDateTime(values.returnDate, values.returnTime)
      if (Number.isNaN(pickup.getTime()) || Number.isNaN(dropoff.getTime())) return

      // Anchored on the return date: that's the field the user adjusts to resolve the conflict.
      if (dropoff <= pickup) {
        ctx.addIssue({ code: 'custom', path: ['returnDate'], message: t('booking.returnBeforePickup') })
      }
    })
}

export type BookingFormValues = z.infer<ReturnType<typeof bookingFormSchema>>
export type AdditionalDriverValues = z.infer<ReturnType<typeof additionalDriverSchema>>
export type BookingFeeValues = z.infer<ReturnType<typeof bookingFeeSchema>>

export const BOOKING_STEP_FIELDS = {
  trip: [
    'pickupLocation',
    'returnLocation',
    'pickupDate',
    'pickupTime',
    'returnDate',
    'returnTime',
    'vehicleId',
  ],
  renter: [
    'customerName',
    'customerEmail',
    'customerPhone',
    'customerDob',
    'customerAddress',
    'licenceNumber',
    'licenceExpiry',
  ],
  pricing: ['rateOptionId', 'additionalDrivers', 'fees'],
  review: [],
} as const satisfies Record<string, (keyof BookingFormValues)[]>
