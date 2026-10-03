import { describe, expect, it } from 'vitest'
import { changedValues, currencyLabel, isSocialUrl } from './company.utils'

describe('changedValues', () => {
  it('keeps only the fields that changed', () => {
    const initial = { name: 'Sunstate', website: '', contactEmail: 'a@sunstate.com' }
    const values = { name: 'Sunstate Car Co.', website: '', contactEmail: 'a@sunstate.com' }

    expect(changedValues(values, initial)).toEqual({ name: 'Sunstate Car Co.' })
  })

  it('ignores whitespace-only edits, which the API would trim back to the same value', () => {
    expect(changedValues({ name: 'Sunstate ' }, { name: 'Sunstate' })).toEqual({})
  })

  it('reports a cleared field, so it can be sent as null', () => {
    expect(changedValues({ website: '' }, { website: 'https://sunstate.com' })).toEqual({ website: '' })
  })
})

describe('isSocialUrl', () => {
  it.each([
    ['', 'blank'],
    ['instagram.com/sunstate', 'bare host'],
    ['https://www.instagram.com/sunstate/', 'www and trailing slash'],
  ])('accepts %j (%s)', (value) => {
    expect(isSocialUrl('instagramUrl', value)).toBe(true)
  })

  it('accepts any of a network’s domains', () => {
    expect(isSocialUrl('xUrl', 'https://twitter.com/sunstate')).toBe(true)
    expect(isSocialUrl('facebookUrl', 'https://fb.com/sunstate')).toBe(true)
  })

  it.each([
    ['https://facebook.com/sunstate', 'another network'],
    ['https://instagram.com.evil.io/sunstate', 'a lookalike host'],
    ['https://instagram.com/', 'the homepage'],
    ['not a url', 'free text'],
  ])('rejects %j (%s)', (value) => {
    expect(isSocialUrl('instagramUrl', value)).toBe(false)
  })
})

describe('currencyLabel', () => {
  it('names the currency in the given language', () => {
    expect(currencyLabel('EUR', 'en')).toBe('EUR — Euro')
    expect(currencyLabel('usd', 'es')).toBe('USD — dólar estadounidense')
  })

  it('falls back to the code, or nothing, instead of throwing', () => {
    // An API that predates the field sends none; Intl throws a RangeError for that.
    expect(currencyLabel(undefined, 'en')).toBe('')
    expect(currencyLabel('US Dollar', 'en')).toBe('US DOLLAR')
  })
})
