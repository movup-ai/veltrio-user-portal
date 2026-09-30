import type { TFunction } from 'i18next'
import { z } from 'zod'
import { isPlausibleDob } from './booking.schema'

type ValidationT = TFunction<'validation'>

/** Two-letter USPS code, upper-cased before it is checked so a typed "tx" is accepted. */
const STATE_PATTERN = /^[A-Z]{2}$/

/** Five digits, or ZIP+4. */
const ZIP_PATTERN = /^\d{5}(-\d{4})?$/

/** The address fields, which the form keeps as flat strings rather than a nested object. */
const ADDRESS_FIELDS = ['street', 'city', 'state', 'zipCode'] as const

export interface VerificationFormValues {
  name: string
  dateOfBirth: string
  street: string
  city: string
  state: string
  zipCode: string
}

export function blankVerificationValues(): VerificationFormValues {
  return { name: '', dateOfBirth: '', street: '', city: '', state: '', zipCode: '' }
}

/** Whether any part of the address has been filled in, which is what makes the rest required. */
export function hasAnyAddress(values: VerificationFormValues): boolean {
  return ADDRESS_FIELDS.some((field) => values[field].trim() !== '')
}

/**
 * The verification form.
 *
 * The address is optional as a block but all-or-nothing once started: Checkr rejects a partial
 * address, so a half-filled one is caught here rather than coming back as a 422.
 */
export function verificationFormSchema(t: ValidationT) {
  return z
    .object({
      name: z.string().trim().min(1, t('booking.customerNameRequired')).max(80),
      dateOfBirth: z
        .string()
        .min(1, t('booking.customerDobRequired'))
        .refine(isPlausibleDob, t('booking.customerDobImplausible')),
      street: z.string().trim().max(120),
      city: z.string().trim().max(80),
      state: z.string().trim(),
      zipCode: z.string().trim(),
    })
    .superRefine((values, ctx) => {
      if (!hasAnyAddress(values)) return

      for (const field of ADDRESS_FIELDS) {
        if (!values[field].trim()) {
          ctx.addIssue({
            code: 'custom',
            path: [field],
            message: t('verification.addressIncomplete'),
          })
        }
      }
      if (values.state.trim() && !STATE_PATTERN.test(values.state.trim().toUpperCase())) {
        ctx.addIssue({ code: 'custom', path: ['state'], message: t('verification.stateInvalid') })
      }
      if (values.zipCode.trim() && !ZIP_PATTERN.test(values.zipCode.trim())) {
        ctx.addIssue({ code: 'custom', path: ['zipCode'], message: t('verification.zipInvalid') })
      }
    })
}

/** The request body, with the address folded back into the object the API expects. */
export function toVerificationOrder(values: VerificationFormValues) {
  return {
    name: values.name.trim(),
    dateOfBirth: values.dateOfBirth,
    address: hasAnyAddress(values)
      ? {
          street: values.street.trim(),
          city: values.city.trim(),
          state: values.state.trim().toUpperCase(),
          zipCode: values.zipCode.trim(),
        }
      : undefined,
  }
}
