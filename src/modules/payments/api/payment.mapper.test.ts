import { describe, expect, it } from 'vitest'
import {
  toBookingExtensions,
  toCancellationQuote,
  toExtensionPayload,
  toExtensionQuote,
  type BookingExtensionsWire,
} from './payment.mapper'

const PENDING: BookingExtensionsWire['history'][number] = {
  id: 'e1',
  status: 'pending',
  previousReturnAt: '2026-10-10T14:00:00Z',
  newReturnAt: '2026-10-12T14:00:00Z',
  previousTotalCents: 23540,
  newTotalCents: 35310,
  amountCents: 11770,
  expiresAt: '2026-10-10T14:00:00Z',
  requestedAt: '2026-10-09T09:00:00Z',
  appliedAt: null,
  acceptedAt: null,
  acceptedName: null,
  acceptedMethod: null,
  link: { token: 'tok', amountCents: 11770, depositCents: 0, currency: 'USD' },
  paymentOpen: true,
  refundDueCents: 0,
  hasAddendum: false,
}

describe('toBookingExtensions', () => {
  it('reads cents as currency units and nulls as absent', () => {
    const extensions = toBookingExtensions({
      extend: { allowed: false, reason: 'extension_pending' },
      availableUntil: null,
      pending: PENDING,
      history: [{ ...PENDING, id: 'e0', status: 'expired', link: null, refundDueCents: 11770 }],
    })

    expect(extensions.extend).toEqual({ allowed: false, reason: 'extension_pending' })
    expect(extensions.availableUntil).toBeUndefined()
    expect(extensions.pending).toMatchObject({
      amount: 117.7,
      previousTotal: 235.4,
      newTotal: 353.1,
      appliedAt: undefined,
      acceptedMethod: undefined,
      link: { token: 'tok', amount: 117.7, deposit: 0, currency: 'USD' },
    })
    expect(extensions.history[0]).toMatchObject({ status: 'expired', link: undefined, refundDue: 117.7 })
  })

  it('keeps the row off but drops a reason it has no words for', () => {
    const extensions = toBookingExtensions({
      extend: { allowed: false, reason: 'something_new' },
      availableUntil: '2026-10-14T09:00:00Z',
      pending: null,
      history: [],
    })

    expect(extensions.extend).toEqual({ allowed: false, reason: undefined })
    expect(extensions.availableUntil).toBe('2026-10-14T09:00:00Z')
    expect(extensions.pending).toBeUndefined()
  })
})

describe('toExtensionQuote', () => {
  it('reads the totals and the rates the whole rental is billed at', () => {
    const quote = toExtensionQuote({
      returnAt: '2026-10-12T14:00:00Z',
      previousTotalCents: 29425,
      totalCents: 32100,
      amountCents: 2675,
      lines: [
        { optionId: 'o1', label: 'Weekly', basis: 'week', rateCents: 30000, count: 1, cappedHours: null },
      ],
      payFirst: true,
    })

    expect(quote).toMatchObject({ previousTotal: 294.25, total: 321, amount: 26.75, payFirst: true })
    expect(quote.lines).toEqual([
      { optionId: 'o1', label: 'Weekly', basis: 'week', rate: 300, count: 1, cappedHours: undefined },
    ])
  })
})

describe('toExtensionPayload', () => {
  it('sends the quoted figure back in whole cents, so it matches what the API gave', () => {
    // 19.99 * 100 is 1998.9999999999998 in floating point.
    expect(toExtensionPayload('2026-10-12T14:00:00Z', 19.99)).toEqual({
      returnAt: '2026-10-12T14:00:00Z',
      amountCents: 1999,
    })
  })
})

describe('toCancellationQuote', () => {
  const wire = {
    cancel: { allowed: true, reason: null },
    currency: 'USD',
    paidCents: 23540,
    paidByHandCents: 5000,
    policy: [{ daysBefore: 7, refundPercent: 50 }],
    refundPercent: 50,
    policyRefundCents: 11770,
    depositHeldCents: 35000,
    withdrawsLink: true,
    emailsRenter: true,
  }

  it('reads cents as currency units', () => {
    expect(toCancellationQuote(wire)).toEqual({
      cancel: { allowed: true, reason: undefined },
      currency: 'USD',
      paid: 235.4,
      paidByHand: 50,
      policy: [{ daysBefore: 7, refundPercent: 50 }],
      refundPercent: 50,
      policyRefund: 117.7,
      depositHeld: 350,
      withdrawsLink: true,
      emailsRenter: true,
    })
  })

  it('tells a booking with no policy from one whose policy refunds nothing', () => {
    const none = toCancellationQuote({ ...wire, policy: null, refundPercent: null, policyRefundCents: null })
    const nonRefundable = toCancellationQuote({ ...wire, policy: [], refundPercent: 0, policyRefundCents: 0 })

    expect([none.policy, none.refundPercent, none.policyRefund]).toEqual([undefined, undefined, undefined])
    expect([nonRefundable.policy, nonRefundable.refundPercent, nonRefundable.policyRefund]).toEqual([
      [],
      0,
      0,
    ])
  })

  it('keeps the button off but drops a reason it has no words for', () => {
    const refused = (reason: string) =>
      toCancellationQuote({ ...wire, cancel: { allowed: false, reason } }).cancel

    expect(refused('vehicle_out')).toEqual({ allowed: false, reason: 'vehicle_out' })
    expect(refused('something_new')).toEqual({ allowed: false, reason: undefined })
  })
})
