import type { PaymentActionRule, PaymentActions } from '@/modules/payments/types/booking-payment.types'

export interface HandoverButton {
  action: 'pickUp' | 'returnVehicle'
  rule: PaymentActionRule
}

/** What pickup can still be waiting for; any other refusal means the car has already gone out. */
const WAITING_FOR = ['not_fully_paid', 'contract_unsigned']

/** Still waiting for the keys to change hands, whether or not it is paid for and signed yet. */
export function isBeforePickup(actions: Pick<PaymentActions, 'pickUp'>): boolean {
  return actions.pickUp.allowed || WAITING_FOR.includes(actions.pickUp.reason ?? '')
}

/**
 * Check in before pickup, Return while the car is out, nothing after. Check in shows before the
 * booking is fully paid and signed too, switched off, so the counter sees what it waits for.
 */
export function handoverButton(
  actions: Pick<PaymentActions, 'pickUp' | 'returnVehicle'>,
): HandoverButton | null {
  if (actions.returnVehicle.allowed) return { action: 'returnVehicle', rule: actions.returnVehicle }
  if (isBeforePickup(actions)) {
    return { action: 'pickUp', rule: actions.pickUp }
  }
  return null
}
