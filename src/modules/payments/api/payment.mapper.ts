import type { CancellationTier } from '@/lib/cancellation-policy'
import { fromCents, toCents } from '@/lib/money'
import type { CheckoutMethod, CheckoutMethodStatus, PaymentAccount } from '../types/payment-account.types'
import type { PaymentState } from '@/modules/bookings/types/booking.types'
import type { BookingWire } from '@/modules/bookings/api/booking.mapper'
import {
  CANCEL_REFUSALS,
  EXTENSION_REFUSALS,
  PAYMENT_REFUSALS,
  type CancelRefusal,
  type ExtensionRefusal,
  type PaymentRefusal,
} from '../constants/payment.constants'
import type {
  BookingExtension,
  BookingExtensions,
  ExtensionConsent,
  ExtensionQuote,
  ExtensionStatus,
} from '../types/booking-extension.types'
import type {
  BookingPaymentKind,
  BookingPaymentRecord,
  BookingPayments,
  BookingPaymentStatus,
  CancelRule,
  CancellationQuote,
  PaymentActionRule,
  PaymentActions,
  PaymentLink,
  ReturnCharge,
  ReturnChargeKind,
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

interface ReturnChargeWire {
  kind: ReturnChargeKind
  amountCents: number
  note: string | null
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
  releaseDeposit: PaymentActionWire
  setReturnCharges: PaymentActionWire
  pickUp: PaymentActionWire
  returnVehicle: PaymentActionWire
  close: PaymentActionWire
  cancel: PaymentActionWire
}

export interface CancellationQuoteWire {
  cancel: PaymentActionWire
  currency: string
  paidCents: number
  paidByHandCents: number
  policy: CancellationTier[] | null
  refundPercent: number | null
  policyRefundCents: number | null
  depositHeldCents: number
  withdrawsLink: boolean
  emailsRenter: boolean
}

export interface BookingPaymentsWire {
  available: boolean
  state: PaymentState
  currency: string
  totalCents: number
  paidCents: number
  refundedCents: number
  balanceCents: number
  returnCharges: ReturnChargeWire[]
  returnChargesCents: number
  returnChargesSaved: boolean
  depositCents: number
  deposit: BookingPaymentWire | null
  openLink: boolean
  depositRequested: boolean
  actions: PaymentActionsWire
  payments: BookingPaymentWire[]
}

export interface PaymentLinkWire {
  token: string
  amountCents: number
  depositCents: number
  currency: string
}

export interface ReceiptLinkWire {
  bookingId: string
  token: string
}

export function toReceiptLink(wire: ReceiptLinkWire): ReceiptLink {
  return { bookingId: wire.bookingId, token: wire.token }
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

/** As for the money actions: a reason with no words here leaves the button off, unexplained. */
function toCancelRule(wire: PaymentActionWire): CancelRule {
  const known = (CANCEL_REFUSALS as readonly string[]).includes(wire.reason ?? '')
  return { allowed: wire.allowed, reason: known ? (wire.reason as CancelRefusal) : undefined }
}

export function toCancellationQuote(wire: CancellationQuoteWire): CancellationQuote {
  return {
    cancel: toCancelRule(wire.cancel),
    currency: wire.currency,
    paid: fromCents(wire.paidCents),
    paidByHand: fromCents(wire.paidByHandCents),
    policy: wire.policy ?? undefined,
    refundPercent: wire.refundPercent ?? undefined,
    policyRefund: wire.policyRefundCents === null ? undefined : fromCents(wire.policyRefundCents),
    depositHeld: fromCents(wire.depositHeldCents),
    withdrawsLink: wire.withdrawsLink,
    emailsRenter: wire.emailsRenter,
  }
}

export function toPaymentActions(wire: PaymentActionsWire): PaymentActions {
  return {
    sendLink: toPaymentAction(wire.sendLink),
    linkIncludesDeposit: wire.linkIncludesDeposit,
    markPaid: toPaymentAction(wire.markPaid),
    requestDeposit: toPaymentAction(wire.requestDeposit),
    releaseDeposit: toPaymentAction(wire.releaseDeposit),
    setReturnCharges: toPaymentAction(wire.setReturnCharges),
    pickUp: toPaymentAction(wire.pickUp),
    returnVehicle: toPaymentAction(wire.returnVehicle),
    close: toPaymentAction(wire.close),
    cancel: toCancelRule(wire.cancel),
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
    returnCharges: wire.returnCharges.map((charge) => ({
      kind: charge.kind,
      amount: fromCents(charge.amountCents),
      note: charge.note ?? undefined,
    })),
    returnChargesTotal: fromCents(wire.returnChargesCents),
    returnChargesSaved: wire.returnChargesSaved,
    depositAmount: fromCents(wire.depositCents),
    deposit: wire.deposit ? toBookingPaymentRecord(wire.deposit) : undefined,
    openLink: wire.openLink,
    depositRequested: wire.depositRequested,
    actions: toPaymentActions(wire.actions),
    payments: wire.payments.map(toBookingPaymentRecord),
  }
}

/** The whole list as the API stores it; it replaces what was there. */
export function toReturnChargesPayload(charges: ReturnCharge[]) {
  return {
    charges: charges.map((charge) => ({
      kind: charge.kind,
      amountCents: toCents(charge.amount),
      note: charge.note?.trim() || null,
    })),
  }
}

export function toPaymentLink(wire: PaymentLinkWire): PaymentLink {
  return {
    token: wire.token,
    amount: fromCents(wire.amountCents),
    deposit: fromCents(wire.depositCents),
    currency: wire.currency,
  }
}

// --- Extensions ----------------------------------------------------------------------------

interface BookingExtensionWire {
  id: string
  status: ExtensionStatus
  previousReturnAt: string
  newReturnAt: string
  previousTotalCents: number
  newTotalCents: number
  amountCents: number
  expiresAt: string | null
  requestedAt: string
  appliedAt: string | null
  acceptedAt: string | null
  acceptedName: string | null
  acceptedMethod: ExtensionConsent | null
  link: PaymentLinkWire | null
  paymentOpen: boolean
  refundDueCents: number
  hasAddendum: boolean
}

export interface BookingExtensionsWire {
  extend: PaymentActionWire
  availableUntil: string | null
  pending: BookingExtensionWire | null
  history: BookingExtensionWire[]
}

export interface ExtensionQuoteWire {
  returnAt: string
  previousTotalCents: number
  totalCents: number
  amountCents: number
  lines: BookingWire['rate']['lines']
  payFirst: boolean
}

function toBookingExtension(wire: BookingExtensionWire): BookingExtension {
  return {
    id: wire.id,
    status: wire.status,
    previousReturnAt: wire.previousReturnAt,
    newReturnAt: wire.newReturnAt,
    previousTotal: fromCents(wire.previousTotalCents),
    newTotal: fromCents(wire.newTotalCents),
    amount: fromCents(wire.amountCents),
    expiresAt: wire.expiresAt ?? undefined,
    requestedAt: wire.requestedAt,
    appliedAt: wire.appliedAt ?? undefined,
    acceptedAt: wire.acceptedAt ?? undefined,
    acceptedName: wire.acceptedName ?? undefined,
    acceptedMethod: wire.acceptedMethod ?? undefined,
    link: wire.link ? toPaymentLink(wire.link) : undefined,
    paymentOpen: wire.paymentOpen,
    refundDue: fromCents(wire.refundDueCents),
    hasAddendum: wire.hasAddendum,
  }
}

export function toBookingExtensions(wire: BookingExtensionsWire): BookingExtensions {
  // As for the money actions: a reason with no words here leaves the row off, unexplained.
  const known = (EXTENSION_REFUSALS as readonly string[]).includes(wire.extend.reason ?? '')
  return {
    extend: {
      allowed: wire.extend.allowed,
      reason: known ? (wire.extend.reason as ExtensionRefusal) : undefined,
    },
    availableUntil: wire.availableUntil ?? undefined,
    pending: wire.pending ? toBookingExtension(wire.pending) : undefined,
    history: wire.history.map(toBookingExtension),
  }
}

export function toExtensionQuote(wire: ExtensionQuoteWire): ExtensionQuote {
  return {
    returnAt: wire.returnAt,
    previousTotal: fromCents(wire.previousTotalCents),
    total: fromCents(wire.totalCents),
    amount: fromCents(wire.amountCents),
    lines: wire.lines.map((line) => ({
      optionId: line.optionId,
      label: line.label,
      basis: line.basis,
      rate: fromCents(line.rateCents),
      count: line.count,
      cappedHours: line.cappedHours ?? undefined,
    })),
    payFirst: wire.payFirst,
  }
}

/** The figure goes back as the API gave it, in cents, so a rounding here cannot read as a change. */
export function toExtensionPayload(returnAt: string, amount: number) {
  return { returnAt, amountCents: toCents(amount) }
}
