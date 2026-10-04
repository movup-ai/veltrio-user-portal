import { describe, expect, it } from 'vitest'
import { toBrandPayload, toCompanyPayload } from './settings.mapper'

describe('toCompanyPayload', () => {
  it('sends a cleared optional field as null, which is how the API clears it', () => {
    expect(toCompanyPayload({ website: '  ', xUrl: '' })).toEqual({ website: null, xUrl: null })
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

describe('toBrandPayload', () => {
  it('upper-cases colours and clears a blank headline with null', () => {
    expect(toBrandPayload({ primaryColor: ' #e11d48 ', headline: '  ' })).toEqual({
      primaryColor: '#E11D48',
      headline: null,
    })
  })
})
