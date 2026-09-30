import { describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import {
  blankVerificationValues,
  hasAnyAddress,
  verificationFormSchema,
  toVerificationOrder,
  type VerificationFormValues,
} from './verification.schema'

const t = i18n.getFixedT('en', 'validation')

function values(overrides: Partial<VerificationFormValues> = {}): VerificationFormValues {
  return { ...blankVerificationValues(), name: 'Jane Doe', dateOfBirth: '1985-07-12', ...overrides }
}

const FULL_ADDRESS = { street: '123 Main St', city: 'Austin', state: 'TX', zipCode: '73301' }

function errorPaths(input: VerificationFormValues): string[] {
  const result = verificationFormSchema(t).safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))
}

describe('the address block', () => {
  it('is optional: a check runs on name and date of birth alone', () => {
    expect(errorPaths(values())).toEqual([])
  })

  it('accepts all four parts together', () => {
    expect(errorPaths(values(FULL_ADDRESS))).toEqual([])
  })

  it('demands the rest once any part is filled in', () => {
    // Checkr rejects a partial address, so a half-filled one is caught here rather than
    // coming back as a 422 the counter cannot act on.
    expect(errorPaths(values({ street: '123 Main St' }))).toEqual(['city', 'state', 'zipCode'])
  })

  it('rejects a state that is not a two-letter code', () => {
    expect(errorPaths(values({ ...FULL_ADDRESS, state: 'Texas' }))).toContain('state')
  })

  it('rejects a ZIP that is not five digits', () => {
    expect(errorPaths(values({ ...FULL_ADDRESS, zipCode: '733' }))).toContain('zipCode')
  })

  it('accepts ZIP+4', () => {
    expect(errorPaths(values({ ...FULL_ADDRESS, zipCode: '73301-1234' }))).toEqual([])
  })
})

describe('hasAnyAddress', () => {
  it('ignores whitespace, so a stray space does not make the block required', () => {
    expect(hasAnyAddress(values({ street: '   ' }))).toBe(false)
  })
})

describe('toVerificationOrder', () => {
  it('leaves the address out entirely when the block is blank', () => {
    // Not an empty object: the API forbids unknown shapes and a blank address is no address.
    expect(toVerificationOrder(values()).address).toBeUndefined()
  })

  it('upper-cases the state, so the counter can type it however they like', () => {
    const order = toVerificationOrder(values({ ...FULL_ADDRESS, state: 'tx' }))

    expect(order.address?.state).toBe('TX')
  })

  it('trims each part', () => {
    const order = toVerificationOrder(values({ ...FULL_ADDRESS, street: '  123 Main St  ' }))

    expect(order.address?.street).toBe('123 Main St')
  })
})
