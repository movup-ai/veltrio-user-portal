import { describe, expect, it } from 'vitest'
import type { Company } from '../types/company.types'
import {
  toBrandPayload,
  toCompany,
  toCompanyPayload,
  toCompanyValues,
  type CompanyWire,
} from './settings.mapper'

describe('toCompanyPayload', () => {
  it('sends a cleared optional field as null, which is how the API clears it', () => {
    expect(toCompanyPayload({ website: '  ', xHandle: '' })).toEqual({ website: null, xHandle: null })
  })

  it('never nulls a required field: the API rejects null there', () => {
    expect(toCompanyPayload({ name: ' ' })).toEqual({ name: '' })
  })

  it('trims and sends only the fields given', () => {
    expect(toCompanyPayload({ name: ' Sunstate ', contactPhone: '+1 305 555 0100 ' })).toEqual({
      name: 'Sunstate',
      contactPhone: '+1 305 555 0100',
    })
  })
})

describe('listing language', () => {
  it('reads the language the company lists its fleet in', () => {
    expect(toCompany({ listingLanguage: 'es' } as CompanyWire).listingLanguage).toBe('es')
  })

  it('reads as English from an API that does not send one yet', () => {
    expect(toCompany({} as CompanyWire).listingLanguage).toBe('en')
  })
})

describe('social usernames', () => {
  it('sends the bare username the API stores, whatever form it was typed in', () => {
    expect(
      toCompanyPayload({
        instagramHandle: '@sunstate',
        tiktokHandle: 'https://www.tiktok.com/@sunstate',
        xHandle: ' ',
      }),
    ).toEqual({ instagramHandle: 'sunstate', tiktokHandle: 'sunstate', xHandle: null })
  })

  it('shows a saved username as it is, and an unset one as blank', () => {
    const company = { instagramHandle: 'sunstate', facebookHandle: 'pages/Sunstate/123' } as Company

    expect(toCompanyValues(company)).toMatchObject({
      instagramHandle: 'sunstate',
      facebookHandle: 'pages/Sunstate/123',
      xHandle: '',
      tiktokHandle: '',
    })
  })
})

describe('toBrandPayload', () => {
  it('upper-cases colours and clears a blank headline with null', () => {
    expect(toBrandPayload({ primaryColor: ' #e11d48 ', headline: '  ' })).toEqual({
      primaryColor: '#E11D48',
      headline: null,
    })
  })
})

describe('the cancellation policy', () => {
  const wire = { name: 'Sunstate', cancellationPolicy: null } as CompanyWire

  it('reads no stated policy as absent, and a non-refundable one as an empty schedule', () => {
    expect(toCompany(wire).cancellationPolicy).toBeUndefined()
    expect(toCompany({ ...wire, cancellationPolicy: [] }).cancellationPolicy).toEqual([])
  })
})
