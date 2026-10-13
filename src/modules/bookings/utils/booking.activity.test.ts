import { describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import type { ActivityActor, BookingActivityEvent } from '../types/booking.types'
import { activityActor, activityFacts, activityKind, activityTitle } from './booking.activity'

const t = i18n.getFixedT('en', 'bookings')
/** Plain enough to read in an assertion, and the same in any runner's zone. */
const format = {
  currency: (amount: number) => `$${amount.toFixed(2)}`,
  dateTime: (iso: string) => iso.slice(5, 16).replace('T', ' '),
  number: (value: number) => value.toLocaleString('en-US'),
}

function event(
  type: string,
  detail: Record<string, unknown> = {},
  actor: ActivityActor = STAFF,
): BookingActivityEvent {
  return { id: 'e1', type, at: '2026-10-14T03:44:00Z', actor, detail }
}

const STAFF = { kind: 'staff', name: 'Pat Owner' } as const
const RENTER = { kind: 'renter' } as const
const SYSTEM = { kind: 'system' } as const

const facts = (type: string, detail: Record<string, unknown> = {}, electric = false) =>
  activityFacts(event(type, detail), t, format, { electric })

describe('activityKind', () => {
  it('knows the actions the API names, and files one it does not under the rest', () => {
    expect(activityKind('payment_recorded')).toBe('payment_recorded')
    expect(activityKind('something_new')).toBe('other')
  })
})

describe('activityTitle', () => {
  it('names what happened', () => {
    expect(activityTitle(event('picked_up'), t)).toBe('Vehicle handed over')
    expect(activityTitle(event('payment_refunded'), t)).toBe('Refund issued')
  })

  it('tells a reservation the renter sent in from a booking made at the counter', () => {
    expect(activityTitle(event('created'), t)).toBe('Booking created')
    expect(activityTitle(event('created', {}, RENTER), t)).toBe('Reservation requested')
  })

  it('still says something for an action this portal has no words for yet', () => {
    expect(activityTitle(event('something_new'), t)).toBe('Booking updated')
  })
})

describe('activityActor', () => {
  it('names the member of staff, and says so when it was the renter or nobody', () => {
    expect(activityActor(event('confirmed'), t)).toBe('Pat Owner')
    expect(activityActor(event('payment_received', {}, RENTER), t)).toBe('Renter')
    expect(activityActor(event('deposit_lapsed', {}, SYSTEM), t)).toBe('Automatic')
    // Removed from the company since: the action stays, without a name to put to it.
    expect(activityActor(event('confirmed', {}, { kind: 'staff' }), t)).toBe('Staff')
  })
})

describe('activityFacts', () => {
  it('says what a booking was made for', () => {
    expect(facts('created', { vehicleName: 'Toyota Camry', total: 235.4 })).toEqual([
      'Toyota Camry',
      '$235.40',
    ])
  })

  it('says how much money moved and how', () => {
    expect(facts('payment_recorded', { amount: 100, method: 'Cash' })).toEqual(['$100.00', 'Cash'])
    expect(facts('payment_received', { amount: 235.4, method: 'Visa ·· 4242', for: 'rental' })).toEqual([
      '$235.40',
      'Visa ·· 4242',
    ])
    expect(facts('payment_received', { amount: 58.85, method: 'Visa ·· 4242', for: 'extension' })).toEqual([
      '$58.85',
      'Visa ·· 4242',
      'for the extension',
    ])
    expect(facts('payment_failed', { message: 'Your card was declined.' })).toEqual([
      'Your card was declined.',
    ])
    expect(facts('deposit_held', { amount: 350 })).toEqual(['$350.00'])
  })

  it('says which refunds the counter has to hand back itself', () => {
    expect(facts('payment_refunded', { amount: 40, method: 'Cash', byHand: true })).toEqual([
      '$40.00',
      'handed back in person',
    ])
    expect(facts('payment_refunded', { amount: 40, method: 'Visa ·· 4242', byHand: false })).toEqual([
      '$40.00',
      'Visa ·· 4242',
    ])
    // A cancellation's refund is one figure across payments, with no single method to name.
    expect(facts('payment_refunded', { amount: 200 })).toEqual(['$200.00'])
  })

  it('says what a link asked for, with the deposit when it asked for both', () => {
    expect(facts('payment_link_created', { amount: 235.4, deposit: 0 })).toEqual(['$235.40'])
    expect(facts('payment_link_created', { amount: 235.4, deposit: 350 })).toEqual([
      '$235.40',
      '+ $350.00 deposit',
    ])
  })

  it('says which end of the rental moved, and the total only when it did', () => {
    const moved = {
      previousPickupAt: '2026-10-20T14:00:00Z',
      pickupAt: '2026-10-20T14:00:00Z',
      previousReturnAt: '2026-10-24T14:00:00Z',
      returnAt: '2026-10-26T14:00:00Z',
      previousTotal: 235.4,
      total: 353.1,
    }

    expect(facts('dates_changed', moved)).toEqual([
      'Return 10-24 14:00 → 10-26 14:00',
      'Total $235.40 → $353.10',
    ])
    expect(facts('dates_changed', { ...moved, pickupAt: '2026-10-21T14:00:00Z', total: 235.4 })).toEqual([
      'Pickup 10-20 14:00 → 10-21 14:00',
      'Return 10-24 14:00 → 10-26 14:00',
    ])
  })

  it('says which car replaced which, and who was added or taken off as a driver', () => {
    const totals = { previousTotal: 235.4, total: 235.4 }

    expect(
      facts('vehicle_swapped', {
        ...totals,
        previousVehicle: 'Toyota Camry',
        vehicle: 'Ford Explorer',
        plate: 'SUV4321',
      }),
    ).toEqual(['Toyota Camry → Ford Explorer (SUV4321)'])
    expect(
      facts('drivers_changed', { ...totals, total: 286.76, added: ['Sam Okafor'], removed: ['Dana Ortiz'] }),
    ).toEqual(['Added Sam Okafor', 'Removed Dana Ortiz', 'Total $235.40 → $286.76'])
  })

  it('says what the car read at a handover, as fuel or as charge', () => {
    expect(facts('picked_up', { odometer: 12000, fuelLevel: 8 })).toEqual(['12,000 mi', 'Fuel Full'])
    expect(facts('returned', { odometer: 12120, fuelLevel: 6 }, true)).toEqual(['12,120 mi', 'Charge 3/4'])
  })

  it('says why a booking was declined or cancelled, with what the renter was told', () => {
    expect(facts('declined', { reason: 'dates_unavailable', message: null })).toEqual([
      'Dates no longer available',
    ])
    expect(facts('cancelled', { reason: 'renter_request', message: 'See you next time' })).toEqual([
      'Renter asked to cancel',
      '“See you next time”',
    ])
  })

  it('says who signed an agreement and how, and why one was voided', () => {
    expect(facts('contract_issued', { template: 'Standard rental agreement' })).toEqual([
      'Standard rental agreement',
    ])
    expect(facts('contract_signed', { signerName: 'Marisol Vega', method: 'counter' })).toEqual([
      'Marisol Vega',
      'at the counter',
    ])
    expect(facts('contract_signed', { signerName: 'Marisol Vega', method: 'e_signature' })).toEqual([
      'Marisol Vega',
      'on the link sent',
    ])
    expect(facts('contract_voided', { reason: 'Booking changed' })).toEqual(['the booking changed'])
    // A reason added to the API later is shown as it comes rather than dropped.
    expect(facts('contract_voided', { reason: 'Company request' })).toEqual(['Company request'])
  })

  it('says what a later return was asked for, and what an extension added', () => {
    expect(facts('extension_requested', { returnAt: '2026-10-26T14:00:00Z', amount: 117.7 })).toEqual([
      'Return 10-26 14:00',
      '$117.70 to pay',
    ])
    expect(
      facts('extended', {
        previousReturnAt: '2026-10-24T14:00:00Z',
        returnAt: '2026-10-26T14:00:00Z',
        amount: 117.7,
      }),
    ).toEqual(['Return 10-24 14:00 → 10-26 14:00', '$117.70 added'])
    expect(facts('extension_accepted', { signerName: 'Marisol Vega' })).toEqual(['Marisol Vega'])
  })

  it('says what the return cost, or that it cost nothing', () => {
    expect(facts('return_charges_set', { count: 2, total: 150 })).toEqual(['2 charges', '$150.00'])
    expect(facts('return_charges_set', { count: 0, total: 0 })).toEqual(['No charges'])
  })

  it('has nothing to add to an action that says it all, or to one logged before details were kept', () => {
    expect(facts('confirmed')).toEqual([])
    expect(facts('payment_recorded')).toEqual([])
    expect(facts('something_new', { amount: 5 })).toEqual([])
  })
})
