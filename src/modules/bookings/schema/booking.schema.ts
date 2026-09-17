import type { TFunction } from 'i18next'
import { z } from 'zod'
import { BOOKING_EXTRAS, type BookingExtraKey } from '../types/booking.types'

type ValidationT = TFunction<'validation'>

/** Cast to a non-empty tuple so `z.enum` infers the literal union rather than plain `string`. */
const EXTRA_KEYS = BOOKING_EXTRAS.map((e) => e.key) as [BookingExtraKey, ...BookingExtraKey[]]

/** `<input type="time">` always yields HH:MM (24h), independent of the displayed locale. */
const TIME_PATTERN = /^\d{2}:\d{2}$/

/** Combines the split date and time inputs into a local Date. */
export function combineDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time || '00:00'}:00`)
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

      // Step 2 — Vehicle & rate
      vehicleId: z.string().min(1, t('booking.vehicleRequired')),
      rateOptionId: z.string().min(1, t('booking.rateOptionRequired')),
      extras: z.array(z.enum(EXTRA_KEYS)),

      // Step 3 — Customer
      customerName: z.string().min(1, t('booking.customerNameRequired')).max(60),
      customerEmail: z.email(t('booking.customerEmailInvalid')),
      customerPhone: z.string().min(6, t('booking.customerPhoneRequired')).max(25),
      customerLicence: z.string().min(1, t('booking.customerLicenceRequired')).max(30),
      notes: z.string().max(400, t('booking.notesTooLong')).optional().or(z.literal('')),
    })
    .superRefine((values, ctx) => {
      if (!values.pickupDate || !values.returnDate || !TIME_PATTERN.test(values.returnTime)) return

      const pickup = combineDateTime(values.pickupDate, values.pickupTime)
      const dropoff = combineDateTime(values.returnDate, values.returnTime)
      if (Number.isNaN(pickup.getTime()) || Number.isNaN(dropoff.getTime())) return

      // Anchored on the return field: that's the one the user adjusts to resolve the conflict.
      if (dropoff <= pickup) {
        ctx.addIssue({ code: 'custom', path: ['returnDate'], message: t('booking.returnBeforePickup') })
      }
    })
}

export type BookingFormValues = z.infer<ReturnType<typeof bookingFormSchema>>

export const BOOKING_STEP_FIELDS = {
  trip: ['pickupLocation', 'returnLocation', 'pickupDate', 'pickupTime', 'returnDate', 'returnTime'],
  vehicle: ['vehicleId', 'rateOptionId', 'extras'],
  customer: ['customerName', 'customerEmail', 'customerPhone', 'customerLicence', 'notes'],
  review: [],
} as const satisfies Record<string, (keyof BookingFormValues)[]>
