import { describe, expect, it } from 'vitest'
import { siteUrl } from '@/modules/vehicles/utils/public-links'
import { ApiError } from '@/types/api'
import { DEPOSIT_STATUS_BADGE, PAYMENT_STATE_BADGE } from '../constants/payment.constants'
import type { BookingPaymentRecord } from '../types/booking-payment.types'
import {
  checkAmount,
  collectedForCharges,
  depositStatus,
  documentFileName,
  linkIsGone,
  parseCharge,
  paymentBadge,
  emailHref,
  linkPurpose,
  paymentLinkUrl,
  refundableAmount,
  refundablePayments,
  receiptLinkUrl,
  refundAttempt,
  rentalHistory,
  settlement,
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
  it("points at the payment page on the company's own site", () => {
    expect(paymentLinkUrl('sunstate', { token: 'abc_123' })).toBe(`${siteUrl('sunstate')}/pay/abc_123`)
    expect(siteUrl('sunstate')).toMatch(/^https:\/\/sunstate\./)
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

describe('parseCharge', () => {
  it('reads nothing typed as no charge, and an amount to the cent', () => {
    expect(parseCharge('')).toBe(0)
    expect(parseCharge('  ')).toBe(0)
    expect(parseCharge('120')).toBe(120)
    expect(parseCharge('11.555')).toBe(11.56)
  })

  it('has no amount for what is not one', () => {
    for (const input of ['abc', '-5', '12,50', 'Infinity']) expect(parseCharge(input)).toBeUndefined()
  })
})

describe('collectedForCharges', () => {
  const taken = (captured: number) => ({ status: 'captured', captured }) as BookingPaymentRecord

  it('is nothing until something is taken or paid towards the charges', () => {
    expect(collectedForCharges({ returnChargesTotal: 0, balance: 0 })).toBe(0)
    expect(collectedForCharges({ returnChargesTotal: 200, balance: 200 })).toBe(0)
  })

  it('counts what was paid another way while the deposit is still on hold', () => {
    expect(collectedForCharges({ returnChargesTotal: 200, balance: 120 })).toBe(80)
  })

  it('counts the deposit taken, and what was paid on top of it', () => {
    expect(collectedForCharges({ returnChargesTotal: 2150, balance: 150, deposit: taken(2000) })).toBe(2000)
    expect(collectedForCharges({ returnChargesTotal: 2150, balance: 0, deposit: taken(2000) })).toBe(2150)
  })

  it('counts all of a deposit taken beyond the charges, which later charges draw on first', () => {
    expect(collectedForCharges({ returnChargesTotal: 300, balance: 0, deposit: taken(500) })).toBe(500)
  })
})

describe('settlement', () => {
  it('captures the charges from the deposit and releases the rest', () => {
    expect(settlement(120, 2000)).toEqual({ capture: 120, release: 1880, due: 0 })
    expect(settlement(0, 2000)).toEqual({ capture: 0, release: 2000, due: 0 })
  })

  it('takes the whole deposit and leaves the rest to collect when charges run past it', () => {
    expect(settlement(2150, 2000)).toEqual({ capture: 2000, release: 0, due: 150 })
    expect(settlement(150, 0)).toEqual({ capture: 0, release: 0, due: 150 })
  })

  it('keeps cents exact', () => {
    expect(settlement(0.3, 0.1)).toEqual({ capture: 0.1, release: 0, due: 0.2 })
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
  it("points at the receipt page on the company's own site, with no tenant id in the path", () => {
    expect(receiptLinkUrl('sunstate', { bookingId: 'b1', token: 'x' })).toBe(
      `${siteUrl('sunstate')}/receipt/b1/x`,
    )
  })
})

describe('refundAttempt', () => {
  const ids =
    (...values: string[]) =>
    () =>
      values.shift() ?? 'spare'

  it('keeps the id while the same refund is asked again', () => {
    const first = refundAttempt(undefined, 'p1', 50, ids('a'))
    expect(refundAttempt(first, 'p1', 50, ids('b')).requestId).toBe('a')
  })

  it('gives a different payment or amount a refund of its own', () => {
    const first = refundAttempt(undefined, 'p1', 50, ids('a'))
    expect(refundAttempt(first, 'p1', 40, ids('b')).requestId).toBe('b')
    expect(refundAttempt(first, 'p2', 50, ids('c')).requestId).toBe('c')
  })
})
