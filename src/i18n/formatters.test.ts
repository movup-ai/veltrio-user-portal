import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { useOrganizationStore } from '@/state/organization.store'
import type { OrganizationMembership } from '@/types/user'
import { formatCurrencyIn, useFormatters } from './formatters'

function setCurrency(currency: string) {
  const membership: OrganizationMembership = {
    organizationId: 't_1',
    organizationName: 'Sunstate',
    subdomain: 'sunstate',
    currency,
    role: 'owner',
    permissions: [],
  }
  useOrganizationStore.setState({ membership })
}

afterEach(() => useOrganizationStore.setState({ membership: null }))

describe('company currency', () => {
  it('prices an amount without its own currency in the company’s', () => {
    setCurrency('EUR')
    expect(formatCurrencyIn('en', 120)).toBe('€120')
  })

  it('keeps an explicit currency, as a payment carries', () => {
    setCurrency('EUR')
    expect(formatCurrencyIn('en', 120, 'USD')).toBe('$120')
  })

  it('falls back to USD before a membership is known', () => {
    expect(formatCurrencyIn('en', 120)).toBe('$120')
  })

  it('re-renders prices when settings change the currency', () => {
    setCurrency('USD')
    const { result } = renderHook(() => useFormatters())
    expect(result.current.currency(120)).toBe('$120')

    act(() => setCurrency('GBP'))

    expect(result.current.currency(120)).toBe('£120')
    expect(result.current.currencyCode).toBe('GBP')
  })
})
