import type { FleetSize } from '@/services/auth/auth.api'

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
  /** Fixed: it is the fleet site's address, and links already shared depend on it. */
  subdomain: string
  website?: string
  fleetSize: FleetSize
  country: string
  timezone: string
  /** What renters are charged in. */
  currency: string
  /** True once bookings exist: they are priced in bare amounts, which a switch would relabel. */
  currencyLocked: boolean
  contactEmail?: string
  contactPhone?: string
  address?: string
}

/** Every editable field as the forms hold it: strings throughout, '' for unset. */
export type CompanyValues = {
  name: string
  legalName: string
  taxId: string
  description: string
  website: string
  fleetSize: FleetSize
  country: string
  currency: string
  timezone: string
  contactEmail: string
  contactPhone: string
  address: string
} & Record<SocialField, string>

export type CompanyPatch = Partial<CompanyValues>
