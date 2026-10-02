import { describe, expect, it } from 'vitest'
import { ApiError } from '@/types/api'
import { DEPOSIT_STATUS_BADGE, PAYMENT_STATE_BADGE } from '../constants/payment.constants'
import type { BookingPaymentRecord } from '../types/booking-payment.types'
import {
  checkAmount,
  depositStatus,
  documentFileName,
  linkIsGone,
  paymentBadge,
  emailHref,
  linkPurpose,
  paymentLinkUrl,
  refundableAmount,
  refundablePayments,
  receiptLinkUrl,
  rentalHistory,
  smsHref,
} from './booking-payment.utils'

function payment(overrides: Partial<BookingPaymentRecord>): BookingPaymentRecord {
  return {
    id: 'p1',
    kind: 'charge',
    status: 'succeeded',
    amount: 319,
    captured: 319,
    refunded: 0,
    currency: 'USD',
    createdAt: '2026-10-03T09:00:00Z',
    ...overrides,
  }
}

describe('paymentLinkUrl', () => {
  it('points at the public payment page on this origin', () => {
    expect(paymentLinkUrl('https://portal.veltrio.test', { tenantId: 't1', token: 'abc_123' })).toBe(
      'https://portal.veltrio.test/pay/t1/abc_123',
    )
  })
})

describe('emailHref', () => {
  it('fills in the address, subject and body, with spaces the mail app reads', () => {
    expect(emailHref(' renter@example.com ', 'Pay for BK-1', 'Hi there')).toBe(
      'mailto:renter%40example.com?subject=Pay%20for%20BK-1&body=Hi%20there',
    )
  })
})

describe('smsHref', () => {
  it('keeps only the digits and plus of the number, and works on iOS and Android', () => {
    expect(smsHref('+1 (305) 442-0118', 'Pay here: https://x')).toBe(
      'sms:+13054420118?&body=Pay%20here%3A%20https%3A%2F%2Fx',
    )
  })
})

describe('refundableAmount', () => {
  it('is what was taken less what was already given back', () => {
    expect(refundableAmount(payment({ captured: 319, refunded: 50.5 }))).toBe(268.5)
  })

  it('is nothing for money not taken: an open link, a hold, a released deposit', () => {
    expect(refundableAmount(payment({ status: 'requires_payment', captured: 0 }))).toBe(0)
    expect(refundableAmount(payment({ kind: 'deposit', status: 'held', captured: 0 }))).toBe(0)
    expect(refundableAmount(payment({ kind: 'deposit', status: 'released', captured: 0 }))).toBe(0)
  })

  it('counts a captured deposit, which can be refunded too', () => {
    expect(refundableAmount(payment({ kind: 'deposit', status: 'captured', captured: 120 }))).toBe(120)
  })
})

describe('refundablePayments', () => {
  it('leaves out payments fully refunded or never taken', () => {
    const open = payment({ id: 'open', status: 'requires_payment', captured: 0 })
    const done = payment({ id: 'done', refunded: 319 })
    const cash = payment({ id: 'cash', kind: 'manual', captured: 100 })

    expect(refundablePayments([open, done, cash]).map((p) => p.id)).toEqual(['cash'])
  })
})

describe('checkAmount', () => {
  it('takes an amount up to the most allowed, rounded to cents', () => {
    expect(checkAmount('120.456', 350)).toEqual({ amount: 120.46 })
    expect(checkAmount('350', 350)).toEqual({ amount: 350 })
  })

  it('refuses nothing, zero, negatives, text and fractions of a cent', () => {
    for (const input of ['', '  ', '0', '-5', 'abc', '0.001']) {
      expect(checkAmount(input, 350)).toEqual({ error: 'invalid' })
    }
  })

  it('refuses more than the most allowed', () => {
    expect(checkAmount('350.01', 350)).toEqual({ error: 'over' })
  })
})

describe('linkPurpose', () => {
  it('words a link by what it asks the renter for', () => {
    expect(linkPurpose({ amount: 319, deposit: 0 })).toBe('payment')
    expect(linkPurpose({ amount: 319, deposit: 350 })).toBe('combined')
    expect(linkPurpose({ amount: 0, deposit: 350 })).toBe('deposit')
  })
})

describe('depositStatus', () => {
  const deposit = (status: BookingPaymentRecord['status']) => payment({ kind: 'deposit', status })

  it('is pending until the renter is asked, then waits on them', () => {
    expect(depositStatus({ depositRequested: false })).toBe('pending')
    expect(depositStatus({ depositRequested: true })).toBe('requested')
  })

  it('follows the hold once there is one', () => {
    expect(depositStatus({ deposit: deposit('held'), depositRequested: false })).toBe('held')
    expect(depositStatus({ deposit: deposit('captured'), depositRequested: false })).toBe('captured')
    expect(depositStatus({ deposit: deposit('released'), depositRequested: false })).toBe('released')
  })

  it('waits on the renter again when a hold lapsed and a new one is asked for', () => {
    expect(depositStatus({ deposit: deposit('released'), depositRequested: true })).toBe('requested')
  })
})

describe('paymentBadge', () => {
  it('reads an unpaid booking with a link out as awaiting the renter', () => {
    expect(paymentBadge({ state: 'unpaid', openLink: true })).toBe('awaiting')
    expect(paymentBadge({ state: 'unpaid', openLink: false })).toBe('unpaid')
  })

  it('keeps any other state as it is', () => {
    expect(paymentBadge({ state: 'deposit_held', openLink: true })).toBe('deposit_held')
    expect(paymentBadge({ state: 'paid', openLink: false })).toBe('paid')
  })
})

describe('rentalHistory', () => {
  it('lists the rental money that moved, not links still out or withdrawn, nor the deposit', () => {
    const history = rentalHistory([
      payment({ id: 'paid', status: 'succeeded' }),
      payment({ id: 'open', status: 'requires_payment' }),
      payment({ id: 'withdrawn', status: 'canceled' }),
      payment({ id: 'deposit', kind: 'deposit', status: 'held' }),
      payment({ id: 'cash', kind: 'manual', status: 'succeeded' }),
      payment({ id: 'pending', status: 'processing' }),
    ])
    expect(history.map((p) => p.id)).toEqual(['paid', 'cash', 'pending'])
  })
})

describe('linkIsGone', () => {
  it('calls a link dead only when the API says it does not exist or cannot be one', () => {
    expect(linkIsGone(new ApiError('not_found', 'This payment link is not valid', { status: 404 }))).toBe(
      true,
    )
    expect(linkIsGone(new ApiError('validation', 'Invalid tenant id', { status: 422 }))).toBe(true)
  })

  it('keeps trying through a Stripe outage or a dropped connection', () => {
    expect(linkIsGone(new ApiError('server_error', 'Stripe is unavailable', { status: 503 }))).toBe(false)
    expect(linkIsGone(new ApiError('network_error', 'Network error'))).toBe(false)
  })
})

describe('badge colours', () => {
  it('keeps a part-paid booking apart from a deposit still to ask for', () => {
    // Side by side on one card: amber on both read as two things left to do.
    expect(PAYMENT_STATE_BADGE.rental_paid).not.toBe(DEPOSIT_STATUS_BADGE.pending)
    expect(PAYMENT_STATE_BADGE.deposit_held).not.toBe(PAYMENT_STATE_BADGE.unpaid)
  })
})

describe('documentFileName', () => {
  it('names the PDF as the API numbers it', () => {
    expect(documentFileName('invoice', 'BK-10001')).toBe('INV-BK-10001.pdf')
    expect(documentFileName('receipt', 'BK-10001')).toBe('RCT-BK-10001.pdf')
  })
})

describe('receiptLinkUrl', () => {
  it("points at this portal's receipt page", () => {
    expect(receiptLinkUrl('https://app.veltrio.test', { tenantId: 't1', bookingId: 'b1', token: 'x' })).toBe(
      'https://app.veltrio.test/receipt/t1/b1/x',
    )
  })
})
