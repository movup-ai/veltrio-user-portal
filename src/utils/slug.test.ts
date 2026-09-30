import { describe, expect, it } from 'vitest'
import { isReservedSubdomain, isValidSubdomain, isValidWebsite, slugify } from './slug'

describe('slugify', () => {
  it('lowercases and hyphenates a company name', () => {
    expect(slugify('Sunstate Car Co.')).toBe('sunstate-car-co')
  })

  it('strips accents rather than splitting on them', () => {
    expect(slugify('Peña Rentals')).toBe('pena-rentals')
  })

  it('collapses runs of separators into a single hyphen', () => {
    expect(slugify('A & B  --  Rentals')).toBe('a-b-rentals')
  })

  it('never starts or ends with a hyphen', () => {
    expect(slugify('  ¡Autos! ')).toBe('autos')
  })

  it('truncates to the 63 character limit without a trailing hyphen', () => {
    const slug = slugify(`${'a'.repeat(62)} rentals`)
    expect(slug).toHaveLength(62)
    expect(slug.endsWith('-')).toBe(false)
  })
})

describe('isValidSubdomain', () => {
  it('accepts a well-formed subdomain', () => {
    expect(isValidSubdomain('sunstate-car-co')).toBe(true)
  })

  it('rejects names that slugify to fewer than three characters', () => {
    expect(slugify('A&')).toBe('a')
    expect(isValidSubdomain('a')).toBe(false)
  })

  it('rejects double hyphens, matching the backend', () => {
    expect(isValidSubdomain('sun--state')).toBe(false)
  })
})

describe('isReservedSubdomain', () => {
  it('rejects the names the API keeps for itself', () => {
    // These passed the pattern and failed at the API with a bare "Request validation failed".
    for (const name of ['app', 'admin', 'portal', 'www']) expect(isReservedSubdomain(name)).toBe(true)
  })

  it('allows an ordinary company name', () => {
    expect(isReservedSubdomain('sun-state-rentals')).toBe(false)
  })
})

describe('isValidWebsite', () => {
  it('allows no website at all', () => {
    expect(isValidWebsite('')).toBe(true)
  })

  it('accepts a bare host the way the API does, adding the scheme itself', () => {
    expect(isValidWebsite('sunstaterentals.com')).toBe(true)
    expect(isValidWebsite('https://sunstaterentals.com')).toBe(true)
  })

  it('rejects a host with no dot, which the API refuses', () => {
    expect(isValidWebsite('sunstaterentals')).toBe(false)
  })
})
