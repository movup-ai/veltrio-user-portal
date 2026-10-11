import { describe, expect, it } from 'vitest'
import { hasEnoughToMatch } from './customer.matching'

describe('hasEnoughToMatch', () => {
  it('waits for something that can identify a customer', () => {
    expect(hasEnoughToMatch({})).toBe(false)
    // Two people share a name, so it only counts beside a date of birth.
    expect(hasEnoughToMatch({ name: 'Marisol Vega' })).toBe(false)
    expect(hasEnoughToMatch({ name: 'Marisol Vega', dateOfBirth: '1991-04-17' })).toBe(true)
    // A number still being typed would match half the book.
    expect(hasEnoughToMatch({ phone: '305 44' })).toBe(false)
    expect(hasEnoughToMatch({ phone: '(305) 442-0118' })).toBe(true)
    expect(hasEnoughToMatch({ email: 'marisol' })).toBe(false)
    expect(hasEnoughToMatch({ email: 'marisol@example.com' })).toBe(true)
    expect(hasEnoughToMatch({ licenceNumber: '   ' })).toBe(false)
    expect(hasEnoughToMatch({ licenceNumber: 'FL D-1' })).toBe(true)
  })
})
