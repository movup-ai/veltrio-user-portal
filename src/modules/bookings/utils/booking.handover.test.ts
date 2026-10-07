import { describe, expect, it } from 'vitest'
import {
  awaitsConfirmation,
  handoverButton,
  isBeforePickup,
  nextStepNeeds,
  pickupWaitsFor,
} from './booking.handover'

const NOT_OUT = { allowed: false, reason: 'not_on_rental' } as const
const NOT_BACK = { allowed: false, reason: 'not_awaiting_close' } as const

describe('handoverButton', () => {
  it('offers Hand over, switched off, until the booking is fully paid', () => {
    const waiting = { allowed: false, reason: 'not_fully_paid' } as const
    expect(handoverButton({ pickUp: waiting, returnVehicle: NOT_OUT, close: NOT_BACK })).toEqual({
      action: 'pickUp',
      rule: waiting,
    })
  })

  it('keeps Hand over on show, switched off, while only the signature is missing', () => {
    // Paid but unsigned: dropping the button here would hide what the counter is waiting for.
    const unsigned = { allowed: false, reason: 'contract_unsigned' } as const
    expect(handoverButton({ pickUp: unsigned, returnVehicle: NOT_OUT, close: NOT_BACK })).toEqual({
      action: 'pickUp',
      rule: unsigned,
    })
    expect(isBeforePickup({ pickUp: unsigned })).toBe(true)
  })

  it('offers Hand over once fully paid', () => {
    const actions = { pickUp: { allowed: true }, returnVehicle: NOT_OUT, close: NOT_BACK }
    expect(handoverButton(actions)?.action).toBe('pickUp')
  })

  it('offers Return while the car is out', () => {
    const gone = { allowed: false, reason: 'not_before_pickup' } as const
    const actions = { pickUp: gone, returnVehicle: { allowed: true }, close: NOT_BACK }
    expect(handoverButton(actions)?.action).toBe('returnVehicle')
  })

  it('offers Close once the car is back, switched off while its deposit is still held', () => {
    // The step that was missing: a returned booking had no button, so it could never finish.
    const gone = { allowed: false, reason: 'not_before_pickup' } as const
    const held = { allowed: false, reason: 'deposit_unsettled' } as const
    expect(handoverButton({ pickUp: gone, returnVehicle: NOT_OUT, close: held })).toEqual({
      action: 'close',
      rule: held,
    })
    expect(handoverButton({ pickUp: gone, returnVehicle: NOT_OUT, close: { allowed: true } })?.action).toBe(
      'close',
    )
  })

  it('offers nothing once the booking is closed or cancelled', () => {
    const gone = { allowed: false, reason: 'not_before_pickup' } as const
    expect(handoverButton({ pickUp: gone, returnVehicle: NOT_OUT, close: NOT_BACK })).toBeNull()
  })
})

describe('pickupWaitsFor', () => {
  const money = (balance: number, depositAmount: number, held = false) => ({
    balance,
    depositAmount,
    deposit: held ? { status: 'held' as const } : undefined,
  })

  it('names everything the handover still waits for, not only the first thing', () => {
    // The API gives one reason at a time, so paying only revealed the next blocker.
    expect(pickupWaitsFor(money(319, 2000), false)).toEqual(['payment', 'deposit', 'signature'])
  })

  it('drops each one as it is done', () => {
    expect(pickupWaitsFor(money(0, 2000), true)).toEqual(['deposit'])
    expect(pickupWaitsFor(money(0, 2000, true), false)).toEqual(['signature'])
    expect(pickupWaitsFor(money(0, 2000, true), true)).toEqual([])
  })

  it('does not wait for a deposit the booking does not ask for', () => {
    expect(pickupWaitsFor(money(319, 0), true)).toEqual(['payment'])
  })
})

describe('nextStepNeeds', () => {
  const gone = { allowed: false, reason: 'not_before_pickup' } as const
  const summary = (actions: object, balance = 0, held = true) => ({
    balance,
    depositAmount: 2000,
    deposit: held ? { status: 'held' as const } : undefined,
    actions: { pickUp: gone, returnVehicle: NOT_OUT, close: NOT_BACK, ...actions },
  })

  it('names what a handover is waiting for', () => {
    const waiting = summary({ pickUp: { allowed: false, reason: 'not_fully_paid' } }, 319, false)
    expect(nextStepNeeds(waiting, false)).toEqual(['payment', 'deposit', 'signature'])
  })

  it('names the deposit a returned booking has to settle before it can be closed', () => {
    const held = summary({ close: { allowed: false, reason: 'deposit_unsettled' } })
    expect(nextStepNeeds(held, true)).toEqual(['settlement'])
  })

  it('needs nothing once the next step can go ahead, or there is none', () => {
    expect(nextStepNeeds(summary({ pickUp: { allowed: true } }), true)).toEqual([])
    expect(nextStepNeeds(summary({ returnVehicle: { allowed: true } }), true)).toEqual([])
    expect(nextStepNeeds(summary({}), true)).toEqual([])
  })
})

describe('awaitsConfirmation', () => {
  it('holds only for a reservation the company has not accepted yet', () => {
    expect(awaitsConfirmation({ allowed: false, reason: 'not_confirmed' })).toBe(true)
    // Off for another reason: the button stays, switched off, with its own explanation.
    expect(awaitsConfirmation({ allowed: false, reason: 'payments_not_ready' })).toBe(false)
    expect(awaitsConfirmation({ allowed: true })).toBe(false)
  })
})

describe('isBeforePickup', () => {
  it('holds until the car goes out, paid or not', () => {
    expect(isBeforePickup({ pickUp: { allowed: false, reason: 'not_fully_paid' } })).toBe(true)
    expect(isBeforePickup({ pickUp: { allowed: true } })).toBe(true)
    expect(isBeforePickup({ pickUp: { allowed: false, reason: 'not_before_pickup' } })).toBe(false)
  })
})
