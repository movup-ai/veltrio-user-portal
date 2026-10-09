import { describe, expect, it } from 'vitest'
import {
  isReservedSubdomain,
  isValidSubdomain,
  isValidWebsite,
  randomSubdomainSuffix,
  slugify,
  SUBDOMAIN_ATTEMPTS,
  subdomainFor,
} from './slug'

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

describe('subdomainFor', () => {
  it('uses the company name itself first', () => {
    expect(subdomainFor('Sunstate Car Co.')).toBe('sunstate-car-co')
  })

  it('numbers later attempts from 2, for when the name is taken', () => {
    expect(subdomainFor('Sunstate Car Co.', 1)).toBe('sunstate-car-co-2')
    expect(subdomainFor('Sunstate Car Co.', 2)).toBe('sunstate-car-co-3')
  })

  it.each([
    ['too short', 'A&', 'a-rentals'],
    ['reserved', 'Portal', 'portal-rentals'],
  ])('still yields something the API accepts when the name is %s', (_case, name, expected) => {
    expect(subdomainFor(name)).toBe(expected)
    expect(isValidSubdomain(expected) && !isReservedSubdomain(expected)).toBe(true)
  })

  it('gives a name with no Latin letters an address of its own', () => {
    // Nothing of the name survives, so without this every such company would compete for
    // the same handful of addresses and renaming would not help.
    const first = subdomainFor('汽车租赁', 0, () => 'k3x9q2')
    const second = subdomainFor('سيارات', 0, () => 'p7m4zt')

    expect(first).toBe('rentals-k3x9q2')
    expect(second).toBe('rentals-p7m4zt')
    expect(isValidSubdomain(first)).toBe(true)
  })

  it('draws a fresh address on every attempt when the name has no Latin letters', () => {
    const tokens = ['aaaaaa', 'bbbbbb']
    const next = () => tokens.shift() ?? ''

    expect(subdomainFor('汽车租赁', 0, next)).toBe('rentals-aaaaaa')
    expect(subdomainFor('汽车租赁', 1, next)).toBe('rentals-bbbbbb')
  })

  it('stops counting on the last attempt, so a popular name cannot dead-end signup', () => {
    const last = SUBDOMAIN_ATTEMPTS - 1

    expect(subdomainFor('Car Rental', last - 1, () => 'k3x9q2')).toBe(`car-rental-${last}`)
    expect(subdomainFor('Car Rental', last, () => 'k3x9q2')).toBe('car-rental-k3x9q2')
  })

  it('keeps a numbered attempt inside the 63 character limit', () => {
    const numbered = subdomainFor('a'.repeat(80), 1)

    expect(numbered).toHaveLength(63)
    expect(numbered.endsWith('-2')).toBe(true)
    expect(isValidSubdomain(numbered)).toBe(true)
  })
})

describe('randomSubdomainSuffix', () => {
  it('is six characters a subdomain allows, and not the same twice', () => {
    const first = randomSubdomainSuffix()

    expect(first).toMatch(/^[a-z0-9]{6}$/)
    expect(randomSubdomainSuffix()).not.toBe(first)
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
