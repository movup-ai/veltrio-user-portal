import { describe, expect, it } from 'vitest'
import {
  toBookingExtensions,
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
