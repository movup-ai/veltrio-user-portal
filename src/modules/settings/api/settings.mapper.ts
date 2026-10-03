import type { FleetSize } from '@/services/auth/auth.api'
import type { Brand, BrandValues } from '../types/brand.types'
import type { Company, CompanyPatch, CompanyValues } from '../types/company.types'

// --- Company ---

export interface CompanyWire {
  id: string
  name: string
  legalName: string | null
  taxId: string | null
  description: string | null
  subdomain: string
  website: string | null
  fleetSize: FleetSize
  country: string
  timezone: string
  currency: string
  currencyLocked: boolean
  contactEmail: string | null
  contactPhone: string | null
  address: string | null
  instagramUrl: string | null
  facebookUrl: string | null
  xUrl: string | null
  tiktokUrl: string | null
}

type CompanyPayload = { [K in keyof CompanyValues]?: CompanyValues[K] | null }

/** The API rejects null for these; the rest are cleared with it. */
const REQUIRED: ReadonlySet<keyof CompanyValues> = new Set(['name', 'fleetSize', 'country', 'currency', 'timezone'])

function optional<T>(value: T | null): T | undefined {
  return value ?? undefined
}

export function toCompany(wire: CompanyWire): Company {
  return {
    id: wire.id,
    name: wire.name,
    legalName: optional(wire.legalName),
    taxId: optional(wire.taxId),
    description: optional(wire.description),
    subdomain: wire.subdomain,
    website: optional(wire.website),
    fleetSize: wire.fleetSize,
    country: wire.country,
    timezone: wire.timezone,
    currency: wire.currency,
    currencyLocked: wire.currencyLocked,
    contactEmail: optional(wire.contactEmail),
    contactPhone: optional(wire.contactPhone),
    address: optional(wire.address),
    instagramUrl: optional(wire.instagramUrl),
    facebookUrl: optional(wire.facebookUrl),
    xUrl: optional(wire.xUrl),
    tiktokUrl: optional(wire.tiktokUrl),
  }
}

export function toCompanyValues(company: Company): CompanyValues {
  return {
    name: company.name,
    legalName: company.legalName ?? '',
    taxId: company.taxId ?? '',
    description: company.description ?? '',
    website: company.website ?? '',
    fleetSize: company.fleetSize,
    country: company.country,
    currency: company.currency,
    timezone: company.timezone,
    contactEmail: company.contactEmail ?? '',
    contactPhone: company.contactPhone ?? '',
    address: company.address ?? '',
    instagramUrl: company.instagramUrl ?? '',
    facebookUrl: company.facebookUrl ?? '',
    xUrl: company.xUrl ?? '',
    tiktokUrl: company.tiktokUrl ?? '',
  }
}

export function toCompanyPayload(patch: CompanyPatch): CompanyPayload {
  const payload: Record<string, string | null> = {}
  for (const [key, value] of Object.entries(patch) as [keyof CompanyValues, string][]) {
    const trimmed = value.trim()
    payload[key] = (trimmed || REQUIRED.has(key)) ? trimmed : null
  }
  return payload as CompanyPayload
}

// --- Brand ---

export interface BrandWire {
  primaryColor: string
  backgroundColor: string
  textColor: string
  headline: string | null
  logoUrl: string | null
  bannerUrl: string | null
}

export function toBrand(wire: BrandWire): Brand {
  return {
    primaryColor: wire.primaryColor,
    backgroundColor: wire.backgroundColor,
    textColor: wire.textColor,
    headline: optional(wire.headline),
    logoUrl: optional(wire.logoUrl),
    bannerUrl: optional(wire.bannerUrl),
  }
}

export function toBrandValues(brand: Brand): BrandValues {
  return {
    primaryColor: brand.primaryColor,
    backgroundColor: brand.backgroundColor,
    textColor: brand.textColor,
    headline: brand.headline ?? '',
  }
}

/** Colours are required, so only the headline is ever cleared, with null. */
export function toBrandPayload(patch: Partial<BrandValues>) {
  const payload: Partial<Record<keyof BrandValues, string | null>> = {}
  for (const [key, value] of Object.entries(patch) as [keyof BrandValues, string][]) {
    const trimmed = value.trim()
    payload[key] = key === 'headline' ? trimmed || null : trimmed.toUpperCase()
  }
  return payload
}
