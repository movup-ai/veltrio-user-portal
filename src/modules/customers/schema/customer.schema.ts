import type { TFunction } from 'i18next'
import { z } from 'zod'
import { isPlausibleDob, uploadedFileSchema } from '@/modules/bookings/schema/booking.schema'
import {
  GENDERS,
  type Customer,
  type CustomerProfileInput,
  type DocumentKind,
  type Gender,
} from '../types/customer.types'

/**
 * A customer added or edited on their own: the fields the renter's own reservation form asks,
 * so one added by hand is as complete as one who booked online. The limits and messages are
 * the booking form's renter step's, so nobody is valid on one screen and refused on another.
 */
export function customerSchema(t: TFunction<'validation'>) {
  return z.object({
    name: z.string().trim().min(1, t('booking.customerNameRequired')).max(60),
    email: z.email(t('booking.customerEmailInvalid')),
    phone: z.string().trim().min(6, t('booking.customerPhoneRequired')).max(25),
    // '' is the select before a choice; "prefer not to say" is a choice, so one is required.
    gender: z.string().refine((value) => toGender(value) !== undefined, {
      message: t('booking.customerGenderRequired'),
    }),
    dateOfBirth: z
      .string()
      .min(1, t('booking.customerDobRequired'))
      .refine(isPlausibleDob, t('booking.customerDobImplausible')),
    address: z
      .string()
      .trim()
      .min(1, t('booking.customerAddressRequired'))
      .max(160, t('booking.addressTooLong')),
    licenceNumber: z.string().trim().min(1, t('booking.customerLicenceRequired')).max(30),
    licenceExpiry: z.string(),
    // Optional, and only offered when adding: an existing customer's scans are on their page.
    licenceDocument: uploadedFileSchema.nullable(),
    insuranceDocument: uploadedFileSchema.nullable(),
  })
}

function toGender(value: string): Gender | undefined {
  return GENDERS.find((gender) => gender === value)
}

export type CustomerFormValues = z.infer<ReturnType<typeof customerSchema>>

export function customerFormValues(customer?: Customer): CustomerFormValues {
  return {
    name: customer?.name ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
    gender: customer?.gender ?? '',
    dateOfBirth: customer?.dateOfBirth ?? '',
    address: customer?.address ?? '',
    licenceNumber: customer?.licenceNumber ?? '',
    licenceExpiry: customer?.licenceExpiry ?? '',
    licenceDocument: null,
    insuranceDocument: null,
  }
}

export function toCustomerInput(values: CustomerFormValues): CustomerProfileInput {
  return {
    name: values.name,
    email: values.email,
    phone: values.phone,
    gender: toGender(values.gender),
    dateOfBirth: values.dateOfBirth,
    address: values.address,
    licenceNumber: values.licenceNumber,
    licenceExpiry: values.licenceExpiry || undefined,
  }
}

/** The scans picked in the form, by kind, for the save to upload once there is a customer. */
export function pickedDocuments(values: CustomerFormValues): Partial<Record<DocumentKind, File>> {
  return {
    ...(values.licenceDocument && { licence: values.licenceDocument.file }),
    ...(values.insuranceDocument && { insurance: values.insuranceDocument.file }),
  }
}
