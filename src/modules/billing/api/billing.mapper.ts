import { CHARGE_STATUS_TONE } from '../constants/billing.constants'
import type { ProviderKind } from '@/modules/bookings/types/booking.types'
import type {
  AutoRecharge,
  Billing,
  BillingHistory,
  BillingInterval,
  Charge,
  ChargeKind,
  ChargeStatus,
  CreditPack,
  Credits,
  Plan,
  PlanChoice,
  PlanOffer,
} from '../types/billing.types'

export interface PlanOfferWire {
  plan: Plan
  maxVehicles: number | null
  maxBranches: number | null
  monthlyCents: number | null
  yearlyCents: number | null
}

export interface CreditPackWire {
  key: string
  credits: number
  priceCents: number
}

export interface CreditsWire {
  balance: number
  costs: Record<ProviderKind, number>
  packs: CreditPackWire[]
  autoRecharge: AutoRecharge | null
  lowBalance: number
}

export type ChargeKindWire = 'subscription' | 'plan_change' | 'credits' | 'auto_recharge' | 'other'

export interface ChargeWire {
  id: string
  kind: ChargeKindWire
  /** Stripe's own, passed through. */
  status: string
  amountCents: number
  currency: string
  createdAt: string
  number: string | null
  invoiceUrl: string | null
  receiptUrl: string | null
}

export interface BillingHistoryWire {
  items: ChargeWire[]
  hasMore: boolean
}

/** Both null switches auto-recharge off. */
export interface AutoRechargeWire {
  pack: string | null
  below: number | null
}

export interface PackCheckoutWire extends CheckoutLinksWire {
  pack: string
}

export interface BillingWire {
  enabled: boolean
  active: boolean
  plan: Plan | null
  interval: BillingInterval | null
  status: string | null
  periodEnd: string | null
  cancelAtPeriodEnd: boolean
  trialAvailable: boolean
  trialDays: number
  vehicles: number
  branches: number
  maxVehicles: number | null
  maxBranches: number | null
  currency: string
  yearlyDiscountPercent: number
  plans: PlanOfferWire[]
  /** Absent from an API build older than the field. */
  recommendedPlan?: Plan
  credits: CreditsWire
}

export interface CheckoutLinksWire {
  successUrl: string
  cancelUrl: string
}

export interface CheckoutWire extends PlanChoice, CheckoutLinksWire {}

export interface LinkWire {
  url: string
}

const dollars = (cents: number | null) => (cents === null ? undefined : cents / 100)

export function toPlanOffer(wire: PlanOfferWire): PlanOffer {
  return {
    plan: wire.plan,
    maxVehicles: wire.maxVehicles ?? undefined,
    maxBranches: wire.maxBranches ?? undefined,
    monthly: dollars(wire.monthlyCents),
    yearly: dollars(wire.yearlyCents),
  }
}

export function toCreditPack(wire: CreditPackWire): CreditPack {
  return { key: wire.key, credits: wire.credits, price: wire.priceCents / 100 }
}

export function toCredits(wire: CreditsWire): Credits {
  return {
    balance: wire.balance,
    costs: wire.costs,
    packs: wire.packs.map(toCreditPack),
    autoRecharge: wire.autoRecharge ?? undefined,
    lowBalance: wire.lowBalance,
  }
}

const CHARGE_KIND: Record<ChargeKindWire, ChargeKind> = {
  subscription: 'subscription',
  plan_change: 'planChange',
  credits: 'credits',
  auto_recharge: 'autoRecharge',
  other: 'other',
}

const isChargeStatus = (status: string): status is ChargeStatus => Object.hasOwn(CHARGE_STATUS_TONE, status)

export function toCharge(wire: ChargeWire): Charge {
  return {
    id: wire.id,
    kind: CHARGE_KIND[wire.kind],
    status: isChargeStatus(wire.status) ? wire.status : undefined,
    amount: wire.amountCents / 100,
    currency: wire.currency,
    at: wire.createdAt,
    number: wire.number ?? undefined,
    invoiceUrl: wire.invoiceUrl ?? undefined,
    receiptUrl: wire.receiptUrl ?? undefined,
  }
}

export function toBillingHistory(wire: BillingHistoryWire): BillingHistory {
  return { charges: wire.items.map(toCharge), hasMore: wire.hasMore }
}

export function toAutoRechargeWire(setting: AutoRecharge | undefined): AutoRechargeWire {
  return { pack: setting?.pack ?? null, below: setting?.below ?? null }
}

export function toBilling(wire: BillingWire): Billing {
  return {
    enabled: wire.enabled,
    active: wire.active,
    plan: wire.plan ?? undefined,
    interval: wire.interval ?? undefined,
    status: wire.status ?? undefined,
    periodEnd: wire.periodEnd ?? undefined,
    cancelAtPeriodEnd: wire.cancelAtPeriodEnd,
    trialAvailable: wire.trialAvailable,
    trialDays: wire.trialDays,
    vehicles: wire.vehicles,
    branches: wire.branches,
    maxVehicles: wire.maxVehicles ?? undefined,
    maxBranches: wire.maxBranches ?? undefined,
    currency: wire.currency,
    yearlyDiscountPercent: wire.yearlyDiscountPercent,
    plans: wire.plans.map(toPlanOffer),
    recommendedPlan: wire.recommendedPlan,
    credits: toCredits(wire.credits),
  }
}
