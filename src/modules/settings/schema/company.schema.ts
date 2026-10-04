import type { TFunction } from 'i18next'
import { z } from 'zod'
import { FLEET_SIZES } from '@/services/auth/auth.api'
import { isCountryCode } from '@/utils/countries'
import { isValidWebsite } from '@/utils/slug'
import { DESCRIPTION_MAX, SOCIAL_DOMAINS, SUPPORTED_CURRENCIES } from '../constants/company.constants'
import type { SocialField } from '../types/company.types'
import { isSocialUrl } from '../utils/company.utils'

/** Every editable field; each settings card validates the slice it shows via `.pick`. */
export function companySchema(t: TFunction<'validation'>) {
  const social = (field: SocialField) =>
    z.string().refine((value) => isSocialUrl(field, value), t('company.socialInvalid', { domain: SOCIAL_DOMAINS[field][0] }))

  return z.object({
    name: z.string().trim().min(1, t('company.nameRequired')).max(200, t('company.nameTooLong')),
    legalName: z.string().trim().max(200, t('company.nameTooLong')),
    taxId: z.string().trim().max(50, t('company.taxIdTooLong')),
    description: z.string().trim().max(DESCRIPTION_MAX, t('company.descriptionTooLong')),
    website: z.string().refine(isValidWebsite, t('company.websiteInvalid')),
    fleetSize: z.enum(FLEET_SIZES),
    country: z.string().refine(isCountryCode, t('company.countryRequired')),
    currency: z.enum(SUPPORTED_CURRENCIES, t('company.currencyRequired')),
    timezone: z.string().trim().min(1, t('company.timezoneRequired')),
    contactEmail: z
      .string()
      .trim()
      .refine((value) => !value || z.email().max(254).safeParse(value).success, t('company.emailInvalid')),
    // Matches the API's Phone: free-form, since numbers are typed in every national format.
    contactPhone: z
      .string()
      .trim()
      .refine((value) => !value || (value.length >= 6 && value.length <= 25), t('company.phoneInvalid')),
    address: z.string().trim().max(160, t('company.addressTooLong')),
    instagramUrl: social('instagramUrl'),
    facebookUrl: social('facebookUrl'),
    xUrl: social('xUrl'),
    tiktokUrl: social('tiktokUrl'),
  })
}
