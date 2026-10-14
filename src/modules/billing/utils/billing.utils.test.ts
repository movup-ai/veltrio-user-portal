import { describe, expect, it } from 'vitest'
import { ApiError } from '@/types/api'
import type { Billing, Credits, PlanOffer } from '../types/billing.types'
import {
  bannerFor,
  billingState,
  checkoutLinks,
  creditLevel,
  isSubscribed,
  packCheckoutLinks,
  planLimitFor,
  planLimitFromError,
  planMove,
  planPrice,
  planShortfall,
  portalReturnUrl,
  pricePerCredit,
} from './billing.utils'

const STARTER: PlanOffer = { plan: 'starter', maxVehicles: 5, maxBranches: 1, monthly: 39, yearly: 399 }
const PRO: PlanOffer = { plan: 'pro', maxVehicles: 50, monthly: 199, yearly: 1999 }
const ENTERPRISE: PlanOffer = { plan: 'enterprise' }

const CREDITS: Credits = {
  balance: 30,
  costs: { background: 2, insurance: 5 },
  packs: [{ key: 'small', credits: 25, price: 25 }],
  lowBalance: 10,
}

function billing(overrides: Partial<Billing> = {}): Billing {
  return {
    enabled: true,
    active: true,
    plan: 'starter',
    interval: 'month',
    status: 'active',
    cancelAtPeriodEnd: false,
    trialAvailable: false,
    trialDays: 7,
    vehicles: 3,
    branches: 1,
    maxVehicles: 5,
    maxBranches: 1,
    currency: 'USD',
    yearlyDiscountPercent: 15,
    plans: [STARTER, PRO, ENTERPRISE],
    credits: CREDITS,
    ...overrides,
  }
}

const NO_PLAN = { active: false, plan: undefined, interval: undefined, status: undefined }

describe('billingState', () => {
  it('reads a deployment that does not bill as off, whatever else it says', () => {
    expect(billingState(billing({ enabled: false, ...NO_PLAN, active: true }))).toBe('off')
  })

  it('tells a company that never subscribed from one whose plan ended', () => {
    expect(billingState(billing(NO_PLAN))).toBe('none')
    expect(billingState(billing({ active: false, status: 'canceled' }))).toBe('ended')
  })

  it('names the running states by what Stripe calls them', () => {
    expect(billingState(billing({ status: 'trialing' }))).toBe('trialing')
    expect(billingState(billing({ status: 'active' }))).toBe('active')
    expect(billingState(billing({ status: 'past_due' }))).toBe('pastDue')
  })

  it('reads a subscription Stripe is still holding as on hold, not as one to buy again', () => {
    // The API refuses a second subscription while this one exists, so "choose a plan" would fail.
    for (const status of ['unpaid', 'incomplete', 'paused']) {
      expect(billingState(billing({ active: false, status }))).toBe('onHold')
    }
    expect(billingState(billing({ active: false, status: 'incomplete_expired' }))).toBe('ended')
  })

  it('says a cancelled trial is ending, not that it is a trial', () => {
    // Stripe still reports `trialing`; telling the owner the card will be charged would be wrong.
    expect(billingState(billing({ status: 'trialing', cancelAtPeriodEnd: true }))).toBe('ending')
  })
})

describe('isSubscribed', () => {
  it('is true while a plan can be switched and false while one has to be bought', () => {
    expect(isSubscribed(billing({ status: 'past_due' }))).toBe(true)
    expect(isSubscribed(billing({ cancelAtPeriodEnd: true }))).toBe(true)
    expect(isSubscribed(billing(NO_PLAN))).toBe(false)
    expect(isSubscribed(billing({ active: false, status: 'canceled' }))).toBe(false)
  })
})

describe('plan prices', () => {
  it('is the price of the period asked for', () => {
    expect(planPrice(STARTER, 'year')).toBe(399)
    expect(planPrice(STARTER, 'month')).toBe(39)
  })

  it('has no price for a quoted plan', () => {
    expect(planPrice(ENTERPRISE, 'month')).toBeUndefined()
    expect(planPrice(ENTERPRISE, 'year')).toBeUndefined()
  })
})

describe('planMove', () => {
  const on = (interval: 'month' | 'year') =>
    billing({ plan: 'pro', interval, plans: [STARTER, PRO, ENTERPRISE] })

  it('calls a larger plan an upgrade and a smaller one a downgrade', () => {
    expect(planMove(on('month'), ENTERPRISE, 'month')).toBe('upgrade')
    expect(planMove(on('month'), STARTER, 'month')).toBe('downgrade')
    // The period being looked at does not turn a downgrade into anything else.
    expect(planMove(on('month'), STARTER, 'year')).toBe('downgrade')
  })

  it('tells the plan the company is on from the same plan on the other period', () => {
    expect(planMove(on('month'), PRO, 'month')).toBe('current')
    expect(planMove(on('month'), PRO, 'year')).toBe('period')
  })
})

describe('planShortfall', () => {
  it('names what a plan is too small for, vehicles first', () => {
    expect(planShortfall(STARTER, { vehicles: 6, branches: 2 })).toBe('vehicles')
    expect(planShortfall(STARTER, { vehicles: 5, branches: 2 })).toBe('branches')
  })

  it('fits a fleet exactly at the limit, and any fleet where there is none', () => {
    expect(planShortfall(STARTER, { vehicles: 5, branches: 1 })).toBeUndefined()
    expect(planShortfall(PRO, { vehicles: 50, branches: 40 })).toBeUndefined()
    expect(planShortfall(ENTERPRISE, { vehicles: 900, branches: 90 })).toBeUndefined()
  })
})

describe('planLimitFor', () => {
  const full = billing({ vehicles: 5, maxVehicles: 5, branches: 1, maxBranches: 1 })

  it('names the limit an add would cross, before anything is filled in', () => {
    expect(planLimitFor(full, 'vehicles')).toBe('vehicles')
    expect(planLimitFor(full, 'branches')).toBe('branches')
    // An import of several is refused as a whole once any of it would not fit.
    expect(planLimitFor(billing({ vehicles: 4, maxVehicles: 5 }), 'vehicles', 2)).toBe('vehicles')
  })

  it('lets through what still fits, and anything a plan does not limit', () => {
    expect(planLimitFor(billing({ vehicles: 4, maxVehicles: 5 }), 'vehicles')).toBeUndefined()
    expect(planLimitFor(billing({ branches: 40, maxBranches: undefined }), 'branches')).toBeUndefined()
  })

  it('stops everything without a running plan, and nothing where billing is off', () => {
    expect(planLimitFor(billing({ active: false }), 'vehicles')).toBe('noPlan')
    expect(planLimitFor(billing({ ...full, enabled: false, active: false }), 'vehicles')).toBeUndefined()
    // Not known yet: the API's refusal is what answers then.
    expect(planLimitFor(undefined, 'vehicles')).toBeUndefined()
  })
})

describe('planLimitFromError', () => {
  const refusal = (code: string) => new ApiError('conflict', 'Refused', { status: 409, code })

  it('reads the plan refusals by their code', () => {
    expect(planLimitFromError(refusal('vehicle_limit_reached'))).toBe('vehicles')
    expect(planLimitFromError(refusal('branch_limit_reached'))).toBe('branches')
    expect(planLimitFromError(refusal('subscription_required'))).toBe('noPlan')
    expect(planLimitFromError(refusal('vin_already_exists'))).toBeUndefined()
  })
})

describe('bannerFor', () => {
  it('tells everyone when no plan is running, in words for who can fix it', () => {
    expect(bannerFor(billing(NO_PLAN), true)).toBe('owner')
    expect(bannerFor(billing(NO_PLAN), false)).toBe('other')
    expect(bannerFor(billing({ active: false, status: 'canceled' }), false)).toBe('other')
  })

  it('tells only the owner about a failed payment', () => {
    expect(bannerFor(billing({ status: 'past_due' }), true)).toBe('pastDue')
    expect(bannerFor(billing({ status: 'past_due' }), false)).toBeUndefined()
  })

  it('sends the owner of a plan on hold to fix the payment, and tells everyone else to ask', () => {
    expect(bannerFor(billing({ active: false, status: 'unpaid' }), true)).toBe('pastDue')
    expect(bannerFor(billing({ active: false, status: 'unpaid' }), false)).toBe('other')
  })

  it('says nothing while the plan is fine or billing is off', () => {
    expect(bannerFor(billing(), true)).toBeUndefined()
    expect(bannerFor(billing({ status: 'trialing' }), true)).toBeUndefined()
    expect(bannerFor(billing({ enabled: false, ...NO_PLAN, active: true }), true)).toBeUndefined()
  })
})

describe('portalReturnUrl', () => {
  it('marks the return from Stripe, so what changed there is read again', () => {
    expect(portalReturnUrl('https://portal.veltrio.test')).toBe(
      'https://portal.veltrio.test/settings/billing?portal=done',
    )
  })
})

describe('checkoutLinks', () => {
  it('returns to the Billing tab, marking only a finished checkout', () => {
    expect(checkoutLinks('https://portal.veltrio.test')).toEqual({
      successUrl: 'https://portal.veltrio.test/settings/billing?checkout=done',
      cancelUrl: 'https://portal.veltrio.test/settings/billing',
    })
  })
})

describe('creditLevel', () => {
  it('is empty once the balance cannot pay for the cheapest check', () => {
    expect(creditLevel({ ...CREDITS, balance: 1 })).toBe('empty')
    expect(creditLevel({ ...CREDITS, balance: 2 })).toBe('low')
  })

  it('warns below the line, but not when auto-recharge is about to top it up', () => {
    expect(creditLevel({ ...CREDITS, balance: 9 })).toBe('low')
    expect(creditLevel({ ...CREDITS, balance: 10 })).toBe('ok')
    expect(creditLevel({ ...CREDITS, balance: 9, autoRecharge: { pack: 'small', below: 10 } })).toBe('ok')
  })

  it('is empty even with auto-recharge on: a check would still be refused right now', () => {
    expect(creditLevel({ ...CREDITS, balance: 0, autoRecharge: { pack: 'small', below: 10 } })).toBe('empty')
  })
})

describe('credit packs', () => {
  it('prices a credit by the pack it comes in', () => {
    expect(pricePerCredit({ key: 'medium', credits: 60, price: 54 })).toBeCloseTo(0.9)
  })

  it("sends the owner back with Stripe's own placeholder for the checkout, left unencoded", () => {
    // Stripe only fills in the literal braces; an encoded `%7B` would come back as text.
    expect(packCheckoutLinks('https://portal.veltrio.test')).toEqual({
      successUrl: 'https://portal.veltrio.test/settings/billing?credits={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://portal.veltrio.test/settings/billing',
    })
  })
})
