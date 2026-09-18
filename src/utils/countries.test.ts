import { describe, expect, it } from 'vitest'
import { countryOptions, isCountryCode } from './countries'

describe('countryOptions', () => {
  it('localizes country names', () => {
    const en = countryOptions('en')
    const es = countryOptions('es')

    expect(en.find((c) => c.code === 'ES')?.name).toBe('Spain')
    expect(es.find((c) => c.code === 'ES')?.name).toBe('España')
  })

  it('sorts by name in the requested language', () => {
    const names = countryOptions('en').map((c) => c.name)
    expect(names).toEqual([...names].sort(new Intl.Collator('en').compare))
  })

  it('returns a unique code for every option', () => {
    const codes = countryOptions('en').map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
})

describe('isCountryCode', () => {
  it('accepts a listed ISO code', () => {
    expect(isCountryCode('US')).toBe(true)
  })

  it('rejects anything not on the list, including a localized name', () => {
    expect(isCountryCode('USA')).toBe(false)
    expect(isCountryCode('United States')).toBe(false)
    expect(isCountryCode('')).toBe(false)
  })
})
