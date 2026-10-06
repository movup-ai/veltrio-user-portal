import { fromCents } from '@/lib/money'
import type { CheckoutMethod, CheckoutMethodStatus, PaymentAccount } from '../types/payment-account.types'
import type { PaymentState } from '@/modules/bookings/types/booking.types'
import { toVehicleSpecs, type VehicleSpecsWire } from '@/modules/vehicles/api/vehicle.mapper'
import { PAYMENT_REFUSALS, type PaymentRefusal } from '../constants/payment.constants'
import type {
  BookingPaymentKind,
  BookingPaymentRecord,
  BookingPayments,
  BookingPaymentStatus,
  PaymentActionRule,
  PaymentActions,
  PaymentLink,
  PublicReceipt,
  ReceiptLink,
} from '../types/booking-payment.types'

export interface PaymentAccountWire {
  available: boolean
  connected: boolean
  disconnected: boolean
  cardPayments: string | null
  payouts: string | null
  requirements: string | null
  currency: string | null
  connectedAt: string | null
}

export interface PaymentMethodsWire {
  methods: { type: string; available: boolean }[]
}

export interface OnboardingLinksWire {
  returnUrl: string
  refreshUrl: string
}

export interface OnboardingLinkWire {
  url: string
}

export function toPaymentAccount(wire: PaymentAccountWire): PaymentAccount {
  return {
    available: wire.available,
    connected: wire.connected,
    disconnected: wire.disconnected,
    cardPayments: wire.cardPayments ?? undefined,
    payouts: wire.payouts ?? undefined,
    requirements: wire.requirements ?? undefined,
    currency: wire.currency ?? undefined,
    connectedAt: wire.connectedAt ?? undefined,
  }
}

const CHECKOUT_METHODS: readonly CheckoutMethod[] = ['card', 'apple_pay', 'google_pay', 'link']

/** Methods the portal has no name for are dropped rather than shown as raw slugs. */
export function toCheckoutMethods(wire: PaymentMethodsWire): CheckoutMethodStatus[] {
  return wire.methods.flatMap((m) =>
    (CHECKOUT_METHODS as readonly string[]).includes(m.type)
      ? [{ type: m.type as CheckoutMethod, available: m.available }]
      : [],
  )
}

export interface BookingPaymentWire {
  id: string
  kind: BookingPaymentKind
  status: BookingPaymentStatus
  amountCents: number
  capturedCents: number
  refundedCents: number
  currency: string
  method: string | null
  failureMessage: string | null
  captureBefore: string | null
  completedAt: string | null
  createdAt: string
}

export interface PaymentActionWire {
  allowed: boolean
  reason: string | null
}

export interface PaymentActionsWire {
  sendLink: PaymentActionWire
  linkIncludesDeposit: boolean
  markPaid: PaymentActionWire
  requestDeposit: PaymentActionWire
  captureDeposit: PaymentActionWire
  releaseDeposit: PaymentActionWire
  pickUp: PaymentActionWire
  returnVehicle: PaymentActionWire
}

export interface BookingPaymentsWire {
  available: boolean
  state: PaymentState
  currency: string
  totalCents: number
  paidCents: number
  refundedCents: number
  balanceCents: number
  depositCents: number
  deposit: BookingPaymentWire | null
  openLink: boolean
  depositRequested: boolean
  actions: PaymentActionsWire
  payments: BookingPaymentWire[]
}

export interface PaymentLinkWire {
  tenantId: string
  token: string
  amountCents: number
  depositCents: number
  currency: string
}

export interface ReceiptLinkWire {
  tenantId: string
  bookingId: string
  token: string
}

export interface PublicReceiptWire {
  number: string
  companyName: string
  reference: string
  renterName: string
  vehicleName: string
  vehiclePhotoUrl: string | null
  vehicleSpecs: VehicleSpecsWire | null
  pickupAt: string
  returnAt: string
  pickupLocation: string
  currency: string
  totalCents: number
  receivedCents: number
  balanceCents: number
  payments: {
    kind: 'rental' | 'deposit'
    method: string | null
    amountCents: number
    refundedCents: number
    completedAt: string | null
  }[]
}

export function toReceiptLink(wire: ReceiptLinkWire): ReceiptLink {
  return { tenantId: wire.tenantId, bookingId: wire.bookingId, token: wire.token }
}

export function toPublicReceipt(wire: PublicReceiptWire): PublicReceipt {
  return {
    number: wire.number,
    companyName: wire.companyName,
    reference: wire.reference,
    renterName: wire.renterName,
    vehicleName: wire.vehicleName,
    vehiclePhotoUrl: wire.vehiclePhotoUrl ?? undefined,
    vehicleSpecs: wire.vehicleSpecs ? toVehicleSpecs(wire.vehicleSpecs) : undefined,
    pickupAt: wire.pickupAt,
    returnAt: wire.returnAt,
    pickupLocation: wire.pickupLocation,
    currency: wire.currency,
    total: fromCents(wire.totalCents),
    received: fromCents(wire.receivedCents),
    balance: fromCents(wire.balanceCents),
    payments: wire.payments.map((p) => ({
      kind: p.kind,
      method: p.method ?? undefined,
      amount: fromCents(p.amountCents),
      refunded: fromCents(p.refundedCents),
      completedAt: p.completedAt ?? undefined,
    })),
  }
}

export function toBookingPaymentRecord(wire: BookingPaymentWire): BookingPaymentRecord {
  return {
    id: wire.id,
    kind: wire.kind,
    status: wire.status,
    amount: fromCents(wire.amountCents),
    captured: fromCents(wire.capturedCents),
    refunded: fromCents(wire.refundedCents),
    currency: wire.currency,
    method: wire.method ?? undefined,
    failureMessage: wire.failureMessage ?? undefined,
    captureBefore: wire.captureBefore ?? undefined,
    completedAt: wire.completedAt ?? undefined,
    createdAt: wire.createdAt,
  }
}

/** A reason this portal has no words for is dropped: the button is still off, just unexplained. */
function toPaymentAction(wire: PaymentActionWire): PaymentActionRule {
  const known = (PAYMENT_REFUSALS as readonly string[]).includes(wire.reason ?? '')
  return { allowed: wire.allowed, reason: known ? (wire.reason as PaymentRefusal) : undefined }
}

export function toPaymentActions(wire: PaymentActionsWire): PaymentActions {
  return {
    sendLink: toPaymentAction(wire.sendLink),
    linkIncludesDeposit: wire.linkIncludesDeposit,
    markPaid: toPaymentAction(wire.markPaid),
    requestDeposit: toPaymentAction(wire.requestDeposit),
    captureDeposit: toPaymentAction(wire.captureDeposit),
    releaseDeposit: toPaymentAction(wire.releaseDeposit),
    pickUp: toPaymentAction(wire.pickUp),
    returnVehicle: toPaymentAction(wire.returnVehicle),
  }
}

export function toBookingPayments(wire: BookingPaymentsWire): BookingPayments {
  return {
    available: wire.available,
    state: wire.state,
    currency: wire.currency,
    total: fromCents(wire.totalCents),
    paid: fromCents(wire.paidCents),
    refunded: fromCents(wire.refundedCents),
    balance: fromCents(wire.balanceCents),
    depositAmount: fromCents(wire.depositCents),
    deposit: wire.deposit ? toBookingPaymentRecord(wire.deposit) : undefined,
    openLink: wire.openLink,
    depositRequested: wire.depositRequested,
    actions: toPaymentActions(wire.actions),
    payments: wire.payments.map(toBookingPaymentRecord),
  }
}

export function toPaymentLink(wire: PaymentLinkWire): PaymentLink {
  return {
    tenantId: wire.tenantId,
    token: wire.token,
    amount: fromCents(wire.amountCents),
    deposit: fromCents(wire.depositCents),
    currency: wire.currency,
  }
}
