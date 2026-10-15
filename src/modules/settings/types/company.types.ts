import type { CancellationPolicy } from '@/lib/cancellation-policy'
import type { FleetSize } from '@/services/auth/auth.api'

import type { LISTING_LANGUAGES } from '../constants/company.constants'

export type ListingLanguage = (typeof LISTING_LANGUAGES)[number]

export const SOCIAL_FIELDS = ['instagramHandle', 'facebookHandle', 'xHandle', 'tiktokHandle'] as const
export type SocialField = (typeof SOCIAL_FIELDS)[number]

/** The signed-in user's company, as the settings page edits it. */
export interface Company extends Partial<Record<SocialField, string>> {
  id: string
  name: string
  legalName?: string
  taxId?: string
  /** A short introduction for the company's fleet site. */
  description?: string
  /** The fleet site's address. Changing it breaks the links already shared under it. */
  subdomain: string
  website?: string
  fleetSize: FleetSize
  country: string
  timezone: string
  /** What renters are charged in. */
  currency: string
  /** True once bookings exist: they are priced in bare amounts, which a switch would relabel. */
  currencyLocked: boolean
  /** What renters read the fleet in, so what a generated vehicle description is written in. */
  listingLanguage: ListingLanguage
  contactEmail?: string
  contactPhone?: string
  address?: string
  /** What a renter who cancels gets back. Absent is no stated policy; empty is non-refundable. */
  cancellationPolicy?: CancellationPolicy
}

/** Every editable field as the forms hold it: strings throughout, '' for unset. */
export type CompanyValues = {
  name: string
  subdomain: string
  legalName: string
  taxId: string
  description: string
  website: string
  fleetSize: FleetSize
  country: string
  currency: string
  listingLanguage: ListingLanguage
  timezone: string
  contactEmail: string
  contactPhone: string
  address: string
} & Record<SocialField, string>

export type CompanyPatch = Partial<CompanyValues>
