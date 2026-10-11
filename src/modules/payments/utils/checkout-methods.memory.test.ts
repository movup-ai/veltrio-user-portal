import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CheckoutMethodStatus } from '../types/payment-account.types'
import { methodsScope, recallMethods, rememberMethods } from './checkout-methods.memory'

const METHODS: CheckoutMethodStatus[] = [
  { type: 'card', available: true },
  { type: 'google_pay', available: false },
]
const SCOPE = 'org_1:2026-10-02T12:00:00Z'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('methodsScope', () => {
  it('names the company and the account it linked, and nothing until both are known', () => {
    expect(methodsScope('org_1', '2026-10-02T12:00:00Z')).toBe(SCOPE)
    expect(methodsScope(undefined, '2026-10-02T12:00:00Z')).toBeUndefined()
    expect(methodsScope('org_1', undefined)).toBeUndefined()
  })
})

describe('recallMethods', () => {
  it('gives back what was remembered for the same account', () => {
    rememberMethods(SCOPE, METHODS)

    expect(recallMethods(SCOPE)).toEqual(METHODS)
  })

  it("keeps one account's methods from another company, and from a later account", () => {
    rememberMethods(SCOPE, METHODS)

    expect(recallMethods('org_2:2026-10-02T12:00:00Z')).toBeUndefined()
    expect(recallMethods('org_1:2026-11-20T09:00:00Z')).toBeUndefined()
    expect(recallMethods(undefined)).toBeUndefined()
  })

  it('shows nothing rather than a list it cannot read whole', () => {
    const stored = (value: string) => {
      localStorage.setItem(`veltrio.checkout_methods.${SCOPE}`, value)
      return recallMethods(SCOPE)
    }

    expect(stored('not json')).toBeUndefined()
    expect(stored('[]')).toBeUndefined()
    expect(stored('{"type":"card","available":true}')).toBeUndefined()
    expect(stored('[{"type":"card","available":true},{"type":"bitcoin","available":true}]')).toBeUndefined()
    expect(stored('[{"type":"card","available":"yes"}]')).toBeUndefined()
  })

  it('carries on without storage, as in a browser that blocks it', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    expect(() => rememberMethods(SCOPE, METHODS)).not.toThrow()
    expect(recallMethods(SCOPE)).toBeUndefined()
  })
})
