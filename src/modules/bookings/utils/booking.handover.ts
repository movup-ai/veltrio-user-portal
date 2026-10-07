import type {
  BookingPayments,
  PaymentActionRule,
  PaymentActions,
} from '@/modules/payments/types/booking-payment.types'

export interface HandoverButton {
  action: 'pickUp' | 'returnVehicle' | 'close'
  rule: PaymentActionRule
}

/** What pickup can still be waiting for; any other refusal means the car has already gone out. */
const WAITING_FOR = ['not_fully_paid', 'contract_unsigned']

/** Still waiting for the keys to change hands, whether or not it is paid for and signed yet. */
export function isBeforePickup(actions: Pick<PaymentActions, 'pickUp'>): boolean {
  return actions.pickUp.allowed || WAITING_FOR.includes(actions.pickUp.reason ?? '')
}

/** A reservation nobody has accepted yet: its money and agreement actions are hidden, not just off. */
export function awaitsConfirmation(rule: { allowed: boolean; reason?: string }): boolean {
  return rule.reason === 'not_confirmed'
}

/**
 * Hand over before pickup, Return while the car is out, Close once it is back, nothing after.
 * Hand over and Close show switched off too, so the counter sees what each is waiting for.
 */
export function handoverButton(
  actions: Pick<PaymentActions, 'pickUp' | 'returnVehicle' | 'close'>,
): HandoverButton | null {
  if (actions.returnVehicle.allowed) return { action: 'returnVehicle', rule: actions.returnVehicle }
  if (isBeforePickup(actions)) {
    return { action: 'pickUp', rule: actions.pickUp }
  }
  // Back, with only a held deposit in the way: any other refusal means there is nothing to close.
  if (actions.close.allowed || actions.close.reason === 'deposit_unsettled') {
    return { action: 'close', rule: actions.close }
  }
  return null
}

export type PickupBlocker = 'payment' | 'deposit' | 'signature'

/**
 * Everything a handover still waits for. The API's rule names one reason at a time, so paying
 * only revealed the next one; these are read from the same summaries its rule is.
 */
export function pickupWaitsFor(
  payments: Pick<BookingPayments, 'balance' | 'depositAmount'> & { deposit?: { status: string } },
  signed: boolean,
): PickupBlocker[] {
  const waiting: PickupBlocker[] = []
  if (payments.balance > 0) waiting.push('payment')
  if (payments.depositAmount > 0 && payments.deposit?.status !== 'held') waiting.push('deposit')
  if (!signed) waiting.push('signature')
  return waiting
}

/** `settlement` is the held deposit a returned booking has to release or capture before closing. */
export type StepNeed = PickupBlocker | 'settlement'

/** What the booking's next step still needs, for the button's tooltip. Empty when it can go ahead. */
export function nextStepNeeds(
  payments: Parameters<typeof pickupWaitsFor>[0] & {
    actions: Pick<PaymentActions, 'pickUp' | 'returnVehicle' | 'close'>
  },
  signed: boolean,
): StepNeed[] {
  const button = handoverButton(payments.actions)
  if (!button || button.rule.allowed) return []
  if (button.action === 'pickUp') return pickupWaitsFor(payments, signed)
  return button.action === 'close' ? ['settlement'] : []
}
