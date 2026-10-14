import type { ProviderKind } from '@/modules/bookings/types/booking.types'

export type Plan = 'starter' | 'growth' | 'pro' | 'enterprise'

export type BillingInterval = 'month' | 'year'

/** A plan as it is offered. A missing limit is no limit; a missing price is a quoted plan. */
export interface PlanOffer {
  plan: Plan
  maxVehicles?: number
  maxBranches?: number
  monthly?: number
  yearly?: number
}

export interface CreditPack {
  key: string
  credits: number
  price: number
}

/** Buy `pack` on the saved card whenever the balance falls below `below`. */
export interface AutoRecharge {
  pack: string
  below: number
}

/** The company's prepaid credits for paid checks. */
export interface Credits {
  balance: number
  /** What each paid check takes. */
  costs: Record<ProviderKind, number>
  packs: CreditPack[]
  /** Absent while auto-recharge is off. */
  autoRecharge?: AutoRecharge
  /** Below this the owner is warned, unless auto-recharge is on. */
  lowBalance: number
}

/** Why the plan refuses adding a vehicle or a branch. */
export type PlanLimit = 'noPlan' | 'vehicles' | 'branches'

export type ChargeKind = 'subscription' | 'planChange' | 'credits' | 'autoRecharge' | 'other'

/** An invoice's standing at Stripe. */
export type ChargeStatus = 'paid' | 'open' | 'void' | 'uncollectible'

/** One line of the billing history: an invoice, or a pack bought by auto-recharge. */
export interface Charge {
  id: string
  kind: ChargeKind
  /** Absent for a status this portal does not know, which is then not stated. */
  status?: ChargeStatus
  /** Negative when a plan change left the company in credit. */
  amount: number
  currency: string
  at: string
  /** The invoice's number; an auto-recharge has no invoice, so none. */
  number?: string
  /** The invoice as a PDF. */
  invoiceUrl?: string
  /** Stripe's receipt page, for a charge made without an invoice. */
  receiptUrl?: string
}

export interface BillingHistory {
  charges: Charge[]
  /** Whether Stripe holds older charges than these. */
  hasMore: boolean
}

/** The company's subscription to Veltrio as the API last synced it, with what it uses. */
export interface Billing {
  /** False where the deployment does not bill: nothing is limited and nothing can be bought. */
  enabled: boolean
  /** Whether the company may add vehicles, take bookings and run checks. */
  active: boolean
  plan?: Plan
  interval?: BillingInterval
  /** Stripe's own subscription status, passed through: `trialing | active | past_due | ...`. */
  status?: string
  /** When the paid period, or the trial, runs out. */
  periodEnd?: string
  cancelAtPeriodEnd: boolean
  trialAvailable: boolean
  trialDays: number
  vehicles: number
  branches: number
  maxVehicles?: number
  maxBranches?: number
  /** What Veltrio charges in, which need not be the currency the company charges renters in. */
  currency: string
  yearlyDiscountPercent: number
  plans: PlanOffer[]
  credits: Credits
}

/** What the Billing tab says about the subscription, from the API's fields. */
export type BillingState = 'off' | 'none' | 'trialing' | 'active' | 'pastDue' | 'ending' | 'onHold' | 'ended'

export interface PlanChoice {
  plan: Plan
  interval: BillingInterval
}
