import { describe, expect, it } from 'vitest'
import { toAutoRechargeWire, toBilling, toBillingHistory, type BillingWire } from './billing.mapper'

const WIRE: BillingWire = {
  enabled: true,
  active: true,
  plan: 'growth',
  interval: 'year',
  status: 'trialing',
  periodEnd: '2026-10-21T09:00:00Z',
  cancelAtPeriodEnd: false,
  trialAvailable: false,
  trialDays: 7,
  vehicles: 8,
  branches: 2,
  maxVehicles: 20,
  maxBranches: 3,
  currency: 'USD',
  yearlyDiscountPercent: 15,
  plans: [
    { plan: 'growth', maxVehicles: 20, maxBranches: 3, monthlyCents: 9900, yearlyCents: 100980 },
    { plan: 'enterprise', maxVehicles: null, maxBranches: null, monthlyCents: null, yearlyCents: null },
  ],
  credits: {
    balance: 12,
    costs: { background: 2, insurance: 5 },
    packs: [{ key: 'medium', credits: 60, priceCents: 5400 }],
    autoRecharge: null,
    lowBalance: 10,
  },
}

describe('toBilling', () => {
  it('reads cents as currency units and keeps the subscription as the API sent it', () => {
    const billing = toBilling(WIRE)

    expect(billing.plans[0]).toEqual({
      plan: 'growth',
      maxVehicles: 20,
      maxBranches: 3,
      monthly: 99,
      yearly: 1009.8,
    })
    expect(billing).toMatchObject({
      plan: 'growth',
      interval: 'year',
      status: 'trialing',
      periodEnd: '2026-10-21T09:00:00Z',
      maxVehicles: 20,
      maxBranches: 3,
    })
  })

  it('reads a null limit as no limit and a null price as a quoted plan', () => {
    expect(toBilling(WIRE).plans[1]).toEqual({
      plan: 'enterprise',
      maxVehicles: undefined,
      maxBranches: undefined,
      monthly: undefined,
      yearly: undefined,
    })
  })

  it('reads a company with no subscription as having no plan at all', () => {
    const billing = toBilling({
      ...WIRE,
      active: false,
      plan: null,
      interval: null,
      status: null,
      periodEnd: null,
      maxVehicles: null,
      maxBranches: null,
    })

    expect(billing.plan).toBeUndefined()
    expect(billing.status).toBeUndefined()
    expect(billing.maxVehicles).toBeUndefined()
  })
})

describe('credits', () => {
  it('reads a pack price in currency units and auto-recharge off as absent', () => {
    expect(toBilling(WIRE).credits).toEqual({
      balance: 12,
      costs: { background: 2, insurance: 5 },
      packs: [{ key: 'medium', credits: 60, price: 54 }],
      autoRecharge: undefined,
      lowBalance: 10,
    })
  })

  it('sends auto-recharge off as both fields null, which is how the API switches it off', () => {
    expect(toAutoRechargeWire(undefined)).toEqual({ pack: null, below: null })
    expect(toAutoRechargeWire({ pack: 'small', below: 10 })).toEqual({ pack: 'small', below: 10 })
  })

  it('reads a charge in dollars, under the name the portal uses for it', () => {
    const wire = {
      id: 'pi_1',
      kind: 'auto_recharge' as const,
      status: 'paid',
      amountCents: 4500,
      currency: 'USD',
      createdAt: '2026-10-14T09:00:00Z',
      number: null,
      invoiceUrl: null,
      receiptUrl: 'https://pay.stripe.test/receipts/pi_1',
    }

    expect(toBillingHistory({ items: [wire], hasMore: true })).toEqual({
      charges: [
        {
          id: 'pi_1',
          kind: 'autoRecharge',
          status: 'paid',
          amount: 45,
          currency: 'USD',
          at: '2026-10-14T09:00:00Z',
          number: undefined,
          invoiceUrl: undefined,
          receiptUrl: 'https://pay.stripe.test/receipts/pi_1',
        },
      ],
      hasMore: true,
    })
  })

  it('leaves a status Stripe adds later unstated rather than guessing what it means', () => {
    const wire = {
      id: 'in_1',
      kind: 'plan_change' as const,
      status: 'something_new',
      amountCents: -6000,
      currency: 'USD',
      createdAt: '2026-10-14T09:00:00Z',
      number: 'VEL-0003',
      invoiceUrl: 'https://pay.stripe.test/invoice/in_1/pdf',
      receiptUrl: null,
    }

    const [charge] = toBillingHistory({ items: [wire], hasMore: false }).charges

    expect([charge.kind, charge.status, charge.amount]).toEqual(['planChange', undefined, -60])
  })
})
