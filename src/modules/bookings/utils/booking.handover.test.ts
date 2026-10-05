import { describe, expect, it } from 'vitest'
import { handoverButton, isBeforePickup } from './booking.handover'

const NOT_OUT = { allowed: false, reason: 'not_on_rental' } as const

describe('handoverButton', () => {
  it('offers Check in, switched off, until the booking is fully paid', () => {
    const waiting = { allowed: false, reason: 'not_fully_paid' } as const
    expect(handoverButton({ pickUp: waiting, returnVehicle: NOT_OUT })).toEqual({
      action: 'pickUp',
      rule: waiting,
    })
  })

  it('keeps Check in on show, switched off, while only the signature is missing', () => {
    // Paid but unsigned: dropping the button here would hide what the counter is waiting for.
    const unsigned = { allowed: false, reason: 'contract_unsigned' } as const
    expect(handoverButton({ pickUp: unsigned, returnVehicle: NOT_OUT })).toEqual({
      action: 'pickUp',
      rule: unsigned,
    })
    expect(isBeforePickup({ pickUp: unsigned })).toBe(true)
  })

  it('offers Check in once fully paid', () => {
    expect(handoverButton({ pickUp: { allowed: true }, returnVehicle: NOT_OUT })?.action).toBe('pickUp')
  })

  it('offers Return while the car is out', () => {
    const gone = { allowed: false, reason: 'not_before_pickup' } as const
    expect(handoverButton({ pickUp: gone, returnVehicle: { allowed: true } })?.action).toBe('returnVehicle')
  })

  it('offers nothing once the car is back or the booking is cancelled', () => {
    const gone = { allowed: false, reason: 'not_before_pickup' } as const
    expect(handoverButton({ pickUp: gone, returnVehicle: NOT_OUT })).toBeNull()
  })
})

describe('isBeforePickup', () => {
  it('holds until the car goes out, paid or not', () => {
    expect(isBeforePickup({ pickUp: { allowed: false, reason: 'not_fully_paid' } })).toBe(true)
    expect(isBeforePickup({ pickUp: { allowed: true } })).toBe(true)
    expect(isBeforePickup({ pickUp: { allowed: false, reason: 'not_before_pickup' } })).toBe(false)
  })
})
