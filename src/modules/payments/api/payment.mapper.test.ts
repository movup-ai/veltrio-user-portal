import { describe, expect, it } from 'vitest'
import {
  toBookingExtensions,
  toCancellationQuote,
  toExtensionPayload,
  toExtensionQuote,
  toPaymentListQuery,
  toPaymentRow,
  toPaymentStats,
  toPayout,
  toPeriodQuery,
  type BookingExtensionsWire,
} from './payment.mapper'

describe('toPaymentRow', () => {
  it('reads cents as currency units and a link with no method as absent', () => {
    const row = toPaymentRow({
      id: 'p1',
      kind: 'charge',
      state: 'pending',
      amountCents: 23540,
      refundedCents: 0,
      currency: 'USD',
      method: null,
      at: '2026-10-08T13:15:25Z',
      bookingReference: 'BK-10005',
      customerName: 'Marisol Vega',
    })

    expect(row).toEqual({
      id: 'p1',
      kind: 'charge',
      state: 'pending',
      amount: 235.4,
      refunded: 0,
      currency: 'USD',
      method: undefined,
      at: '2026-10-08T13:15:25Z',
      bookingReference: 'BK-10005',
      customerName: 'Marisol Vega',
    })
  })
})

describe('toPaymentListQuery', () => {
  it('pages by limit and offset and names the tab as the API spells it', () => {
    const query = toPaymentListQuery({
      search: ' vega ',
      tab: 'Refunded',
      state: 'held',
      method: 'card',
      period: { from: '2026-10-01', to: '2026-10-31' },
      page: 3,
      pageSize: 25,
    })

    expect(query).toEqual({
      limit: 25,
      offset: 50,
      search: 'vega',
      tab: 'refunded',
      state: 'held',
      method: 'card',
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
    })
  })

  it('sends nothing for a filter left on its "any" value', () => {
    const query = toPaymentListQuery({
      search: '  ',
      tab: 'All',
      state: 'Any',
      method: 'All',
      period: { from: '', to: '' },
      page: 1,
      pageSize: 10,
    })

    expect(query).toEqual({ limit: 10, offset: 0 })
  })

  it('cuts a search at the length the API accepts', () => {
    // Longer, and the API answers 422, which the page could only show as a failed load.
    const query = toPaymentListQuery({
      search: 'x'.repeat(200),
      tab: 'All',
      state: 'Any',
      method: 'All',
      period: { from: '', to: '' },
      page: 1,
      pageSize: 10,
    })

    expect(query.search).toHaveLength(80)
  })
})

describe('toPeriodQuery', () => {
  it('sends only the ends of the range that are set', () => {
    expect(toPeriodQuery({ from: '2026-10-01', to: '' })).toEqual({ dateFrom: '2026-10-01' })
    expect(toPeriodQuery({ from: '', to: '' })).toEqual({})
  })
})

describe('toPayout', () => {
  it('reads cents as currency units and what Stripe left out as absent', () => {
    const payout = toPayout({
      id: 'po_1',
      status: 'failed',
      amountCents: 382318,
      currency: 'USD',
      arrivalDate: '2026-10-09',
      destination: null,
      failureMessage: null,
    })

    expect(payout).toEqual({
      id: 'po_1',
      status: 'failed',
      amount: 3823.18,
      currency: 'USD',
      arrivalDate: '2026-10-09',
      destination: undefined,
      failureMessage: undefined,
    })
  })
})

describe('toPaymentStats', () => {
  it('reads the money in currency units and leaves the counts alone', () => {
    const stats = toPaymentStats({
      collectedCents: 123450,
      refundedCents: 5000,
      outstandingCents: 23540,
      outstandingBookings: 1,
      failed: 2,
      heldCents: 400000,
      held: 2,
    })

    expect(stats).toEqual({
      collected: 1234.5,
      refunded: 50,
      outstanding: 235.4,
      outstandingBookings: 1,
      failed: 2,
      held: 4000,
      heldCount: 2,
    })
  })
})

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
