import { describe, expect, it } from 'vitest'
import type { PaymentAccount } from '../types/payment-account.types'
import { accountState, onboardingLinks } from './payment-account.utils'

const CONNECTED: PaymentAccount = {
  available: true,
  connected: true,
  disconnected: false,
  cardPayments: 'active',
  payouts: 'active',
}

describe('accountState', () => {
  it('reports payments off when the API has no Stripe key, connected or not', () => {
    expect(accountState({ available: false, connected: false, disconnected: false })).toBe('unavailable')
    expect(accountState({ ...CONNECTED, available: false })).toBe('unavailable')
  })

  it('offers to connect a company with no account', () => {
    expect(accountState({ available: true, connected: false, disconnected: false })).toBe('notConnected')
  })

  it('offers to reconnect an account the owner unlinked, whatever Stripe says of it', () => {
    expect(accountState({ ...CONNECTED, connected: false, disconnected: true })).toBe('disconnected')
  })

  it('is active only once both cards and payouts are on', () => {
    expect(accountState(CONNECTED)).toBe('active')
    expect(accountState({ ...CONNECTED, payouts: 'pending' })).toBe('inReview')
  })

  it('asks for details Stripe is waiting on, even while the account is under review', () => {
    expect(accountState({ ...CONNECTED, cardPayments: 'pending', requirements: 'currently_due' })).toBe(
      'needsInfo',
    )
    expect(accountState({ ...CONNECTED, requirements: 'past_due' })).toBe('needsInfo')
  })

  it('leaves details due later to Stripe, so an active account stays active', () => {
    expect(accountState({ ...CONNECTED, requirements: 'eventually_due' })).toBe('active')
  })

  it('says so when Stripe has turned the company down', () => {
    expect(accountState({ ...CONNECTED, cardPayments: 'rejected', requirements: 'currently_due' })).toBe(
      'rejected',
    )
  })
})

describe('onboardingLinks', () => {
  it('brings the owner back to the payments settings on this origin', () => {
    expect(onboardingLinks('https://portal.veltrio.test')).toEqual({
      returnUrl: 'https://portal.veltrio.test/app/settings/payments?stripe=return',
      refreshUrl: 'https://portal.veltrio.test/app/settings/payments?stripe=refresh',
    })
  })
})
