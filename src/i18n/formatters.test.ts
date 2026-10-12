import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

describe('dateTime', () => {
  it('shows a moment on the 12-hour clock, with am or pm', () => {
    const { result } = renderHook(() => useFormatters())
    // Built from local parts, so the assertion holds in whichever zone the tests run.
    const evening = new Date(2026, 9, 2, 23, 21)
    const morning = new Date(2026, 9, 14, 9, 5)

    // 23:21 was being read as a 24-hour time by people used to 11:21 PM.
    expect(result.current.dateTime(evening)).toBe('Oct 2, 11:21 PM')
    expect(result.current.dateTime(morning.toISOString())).toBe('Oct 14, 9:05 AM')
  })
})

describe('dateTime zone name', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('is judged at the time shown, not today: two clocks can agree now and differ then', () => {
    // Los Angeles and Phoenix read the same in July and an hour apart in December.
    const options = Intl.DateTimeFormat().resolvedOptions()
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      ...options,
      timeZone: 'America/Los_Angeles',
    })
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-07-01T12:00:00Z'))
    useOrganizationStore.setState({ membership: { timezone: 'America/Phoenix' } as OrganizationMembership })
    const { result } = renderHook(() => useFormatters())

    expect(result.current.dateTime('2026-12-10T17:00:00Z')).toBe('Dec 10, 10:00 AM MST')
    expect(result.current.dateTime('2026-07-10T17:00:00Z')).toBe('Jul 10, 10:00 AM')
  })
})

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
