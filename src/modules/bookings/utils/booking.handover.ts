import type { PaymentActionRule, PaymentActions } from '@/modules/payments/types/booking-payment.types'

export interface HandoverButton {
  action: 'pickUp' | 'returnVehicle'
  rule: PaymentActionRule
}

/** Still waiting for the keys to change hands, whether or not it is paid for yet. */
export function isBeforePickup(actions: Pick<PaymentActions, 'pickUp'>): boolean {
  return actions.pickUp.allowed || actions.pickUp.reason === 'not_fully_paid'
}

/**
 * Check in before pickup, Return while the car is out, nothing after. Check in shows before the
 * booking is fully paid too, switched off, so the counter sees what it waits for.
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
