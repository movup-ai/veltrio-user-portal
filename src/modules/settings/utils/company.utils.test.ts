import { describe, expect, it } from 'vitest'
import type { SocialField } from '../types/company.types'
import { changedValues, currencyLabel, isPhoneNumber, isSocialHandle, toSocialHandle } from './company.utils'

describe('isPhoneNumber', () => {
  it.each(['+1 305 555 0100', '(305) 555-0100', '305.555.0100', '+34 600 000 000', '3055550'])('accepts %j', (value) => {
    expect(isPhoneNumber(value)).toBe(true)
  })

  it.each([
    ['+1 917920626e', 'a letter'],
    ['123456', 'too few digits'],
    ['+1 305 555 0100 0100 99', 'more than 15 digits'],
    ['call me', 'no digits'],
    ['-305 555 0100', 'a leading separator'],
  ])('rejects %j (%s)', (value) => {
    expect(isPhoneNumber(value)).toBe(false)
  })
})

describe('toSocialHandle', () => {
  it.each([
    ['sunstate', 'a username'],
    ['@sunstate', 'an @handle'],
    [' sunstate/ ', 'padding and a trailing slash'],
    ['instagram.com/sunstate', 'a bare link'],
    ['https://www.instagram.com/sunstate/', 'a pasted link'],
  ])('reduces %j (%s) to the username', (typed) => {
    expect(toSocialHandle('instagramHandle', typed)).toBe('sunstate')
  })

  it('drops the @ a TikTok link carries, and reads any of a network’s domains', () => {
    expect(toSocialHandle('tiktokHandle', 'https://www.tiktok.com/@sunstate')).toBe('sunstate')
    expect(toSocialHandle('xHandle', 'https://twitter.com/sunstate')).toBe('sunstate')
  })

  it('keeps a username with a dot, and a longer Facebook path, as typed', () => {
    expect(toSocialHandle('instagramHandle', 'sun.state')).toBe('sun.state')
    expect(toSocialHandle('facebookHandle', 'profile.php?id=100')).toBe('profile.php?id=100')
    expect(toSocialHandle('facebookHandle', 'https://facebook.com/pages/Sunstate/123/')).toBe('pages/Sunstate/123')
  })

  it('leaves a link to another site as typed, for validation to refuse', () => {
    expect(toSocialHandle('instagramHandle', 'facebook.com/sunstate')).toBe('facebook.com/sunstate')
  })
})

describe('isSocialHandle', () => {
  it.each([
    ['', 'blank'],
    ['@', 'only an @, which is blank once stripped'],
    ['sunstate', 'a username'],
    ['https://www.instagram.com/sunstate/', 'a link to its own network'],
  ])('accepts %j (%s)', (value) => {
    expect(isSocialHandle('instagramHandle', value)).toBe(true)
  })

  it.each([
    ['https://facebook.com/sunstate', 'a link to another network'],
    ['instagram.com.evil.io/sunstate', 'a lookalike host'],
    ['sun state', 'a space'],
    ['x'.repeat(101), 'over the length limit'],
  ])('rejects %j (%s)', (value) => {
    expect(isSocialHandle('instagramHandle', value)).toBe(false)
  })
})

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

describe('social usernames, from the review findings', () => {
  it('drops tracking from a pasted link, but keeps the id that is a Facebook profile', () => {
    expect(toSocialHandle('instagramHandle', 'https://instagram.com/sunstate/?ref=x')).toBe('sunstate')
    expect(toSocialHandle('xHandle', 'https://x.com/sunstate#about')).toBe('sunstate')
    expect(toSocialHandle('facebookHandle', 'https://www.facebook.com/profile.php?id=100&ref=x')).toBe(
      'profile.php?id=100',
    )
  })

  it('refuses a link with no profile rather than reading it as blank, which would clear the saved name', () => {
    expect(toSocialHandle('instagramHandle', 'https://instagram.com/')).not.toBe('')
    expect(isSocialHandle('instagramHandle', 'https://instagram.com/')).toBe(false)
  })

  it.each<[SocialField, string, string]>([
    ['instagramHandle', 'facebook.com', 'another network’s bare host'],
    ['instagramHandle', 'www.instagram.com', 'its own bare host'],
    ['instagramHandle', 'sunstate?ref=x', 'a typed query string'],
    ['xHandle', 'sun.state', 'a dot, which X usernames cannot have'],
    ['facebookHandle', 'sunstate?ref=x', 'tracking on a Facebook name'],
  ])('rejects %s %j (%s)', (field, value) => {
    expect(isSocialHandle(field, value)).toBe(false)
  })

  it.each<[SocialField, string]>([
    ['instagramHandle', 'sun.state_1'],
    ['xHandle', 'sun_state'],
    ['tiktokHandle', 'sun.state'],
    ['facebookHandle', 'profile.php?id=100012345'],
    ['facebookHandle', 'pages/Sunstate/123'],
  ])('accepts %s %j, in the network’s own format', (field, value) => {
    expect(isSocialHandle(field, value)).toBe(true)
  })
})
