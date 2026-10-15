import { describe, expect, it } from 'vitest'
import type { Location } from '@/modules/locations/types/location.types'
import type { Company } from '../types/company.types'
import { companyStepPatch, movedBranch, starterBranch, type CompanyStepValues } from './company-step.utils'

const COMPANY: Company = {
  id: 't_1',
  name: 'Sunstate Car Co.',
  subdomain: 'sunstate',
  fleetSize: '6_20',
  country: 'US',
  timezone: 'America/New_York',
  currency: 'USD',
  currencyLocked: false,
  listingLanguage: 'en',
  additionalDriverPrice: 12,
  address: '1450 Alton Road, Miami Beach, FL 33139',
}

const AS_SAVED: CompanyStepValues = {
  tenantName: COMPANY.name,
  subdomain: COMPANY.subdomain,
  address: COMPANY.address ?? '',
  country: COMPANY.country,
  timezone: COMPANY.timezone,
  fleetSize: COMPANY.fleetSize,
}

const BRANCH: Location = {
  id: 'loc_1',
  name: 'Main Office',
  address: '1450 Alton Road, Miami Beach, FL 33139',
  originalAddress: '1450 Alton Road, Miami Beach, FL 33139',
  street: '1450 Alton Road',
  city: 'Miami Beach',
  latitude: 25.78,
  longitude: -80.14,
  status: 'Open',
  openingDays: 'monSun',
  opensAt: 480,
  closesAt: 1200,
  isDefault: true,
  vehicleCount: 0,
} satisfies Location

describe('companyStepPatch', () => {
  it('sends nothing when nothing was changed', () => {
    expect(companyStepPatch(AS_SAVED, COMPANY)).toEqual({})
  })

  it('sends only the changed fields, under the company’s own names', () => {
    const patch = companyStepPatch(
      { ...AS_SAVED, tenantName: ' Sunstate Rentals ', fleetSize: '21_50', subdomain: 'Sunstate' },
      COMPANY,
    )

    // The URL typed in capitals is the same URL, so it is not sent.
    expect(patch).toEqual({ name: 'Sunstate Rentals', fleetSize: '21_50' })
  })

  it('counts an address filled in where none was saved as a change', () => {
    const patch = companyStepPatch({ ...AS_SAVED, address: '5 Ocean Dr' }, { ...COMPANY, address: undefined })

    expect(patch).toEqual({ address: '5 Ocean Dr' })
  })
})

describe('starterBranch', () => {
  it('is the only branch, still at the company’s address', () => {
    expect(starterBranch([BRANCH], COMPANY.address)).toBe(BRANCH)
  })

  it('is none once the owner has moved the branch or added another', () => {
    expect(starterBranch([{ ...BRANCH, address: '9 Collins Ave' }], COMPANY.address)).toBeUndefined()
    expect(starterBranch([BRANCH, { ...BRANCH, id: 'loc_2' }], COMPANY.address)).toBeUndefined()
  })

  it('is none when the company had no address to match', () => {
    expect(starterBranch([BRANCH], undefined)).toBeUndefined()
  })
})

describe('movedBranch', () => {
  it('takes the new address and the pin it was picked with', () => {
    const moved = movedBranch(BRANCH, '5 Ocean Dr, Miami Beach', {
      street: '5 Ocean Dr',
      latitude: 25.7,
      longitude: -80.1,
    })

    expect(moved).toMatchObject({
      name: 'Main Office',
      isDefault: true,
      address: '5 Ocean Dr, Miami Beach',
      originalAddress: '5 Ocean Dr, Miami Beach',
      street: '5 Ocean Dr',
      latitude: 25.7,
    })
  })

  it('keeps none of the old pin for an address typed by hand', () => {
    const moved = movedBranch(BRANCH, 'Behind the blue gate', {})

    expect(moved).toMatchObject({
      street: undefined,
      city: undefined,
      latitude: undefined,
      longitude: undefined,
    })
  })
})
