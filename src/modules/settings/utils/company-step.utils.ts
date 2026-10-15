import type { FleetSize } from '@/services/auth/auth.api'
import type { AddressPin, Location, LocationInput } from '@/modules/locations/types/location.types'
import type { Company, CompanyPatch } from '../types/company.types'

/** The company details onboarding's company step asks for, as its form holds them. */
export interface CompanyStepValues {
  tenantName: string
  subdomain: string
  address: string
  country: string
  timezone: string
  fleetSize: FleetSize
}

/** What a return to the company step changed, as a settings patch: only those fields are sent. */
export function companyStepPatch(values: CompanyStepValues, company: Company): CompanyPatch {
  const typed: CompanyPatch = {
    name: values.tenantName.trim(),
    subdomain: values.subdomain.trim().toLowerCase(),
    address: values.address.trim(),
    country: values.country,
    timezone: values.timezone,
    fleetSize: values.fleetSize,
  }
  const saved: CompanyPatch = {
    name: company.name,
    subdomain: company.subdomain,
    address: company.address ?? '',
    country: company.country,
    timezone: company.timezone,
    fleetSize: company.fleetSize,
  }
  return Object.fromEntries(
    Object.entries(typed).filter(([key, value]) => value !== saved[key as keyof CompanyPatch]),
  ) as CompanyPatch
}

/**
 * The branch onboarding made from the company address, while it is still just that: the only
 * branch, at the address the company had. One edited or joined by another since is the owner's.
 */
export function starterBranch(
  branches: Location[],
  companyAddress: string | undefined,
): Location | undefined {
  const [only, ...others] = branches
  return only && others.length === 0 && companyAddress && only.address === companyAddress ? only : undefined
}

/** The branch moved to the new address, as registration would have made it there. */
export function movedBranch(branch: Location, address: string, pin: AddressPin): LocationInput {
  return {
    name: branch.name,
    status: branch.status,
    openingDays: branch.openingDays,
    opensAt: branch.opensAt,
    closesAt: branch.closesAt,
    isDefault: branch.isDefault,
    address,
    originalAddress: address,
    // All parts from the new pin, none kept from the old: a typed address has no pin at all.
    street: pin.street,
    city: pin.city,
    state: pin.state,
    postalCode: pin.postalCode,
    country: pin.country,
    latitude: pin.latitude,
    longitude: pin.longitude,
  }
}
