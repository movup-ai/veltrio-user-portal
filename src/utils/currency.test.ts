import { describe, expect, it } from 'vitest'
import { formatCurrency, formatCurrencyPrecise } from './currency'

describe('formatCurrency', () => {
  it('rounds to whole dollars', () => {
    expect(formatCurrency(89.6)).toBe('$90')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0')
  })
})

describe('formatCurrencyPrecise', () => {
  it('keeps cents', () => {
    expect(formatCurrencyPrecise(89.5)).toBe('$89.50')
  })
})
