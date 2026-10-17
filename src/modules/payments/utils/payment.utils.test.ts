import { describe, expect, it } from 'vitest'
import type { PaymentFilters, PaymentRow, PaymentRowState, Payout } from '../types/payment.types'
import {
  hasReceipt,
  isOwnWorded,
  paymentFiltersActive,
  paymentReceiptFileName,
  paymentRow,
  payoutsCsv,
  sharedStatus,
} from './payment.utils'

const payment: PaymentRow = {
  id: 'p1',
  kind: 'charge',
  state: 'paid',
  amount: 235.4,
  refunded: 0,
  currency: 'USD',
  method: 'Visa ·· 4242',
  at: '2026-10-08T13:15:25Z',
  bookingReference: 'BK-10005',
  customerName: 'Marisol Vega',
}

const LABELS = {
  kind: 'Card payment',
  date: 'Oct 8, 2026',
  amount: '$235.40',
  held: 'On hold',
  released: 'Released',
  partlyRefunded: 'Refunded $50',
}
const METHOD_CELL = 2
const STATUS_CELL = 3

const badge = (state: PaymentRowState) => paymentRow({ ...payment, state }, LABELS, []).cells[STATUS_CELL]

describe('paymentRow', () => {
  it('is keyed on the payment and names the renter with their booking', () => {
    const row = paymentRow(payment, LABELS, [])

    expect(row.key).toBe('p1')
    expect(row.cells[0]).toMatchObject({ primary: 'Card payment', secondary: 'Oct 8, 2026' })
    expect(row.cells[1]).toMatchObject({ primary: 'Marisol Vega', secondary: 'BK-10005' })
  })

  it('badges a state the shared vocabulary names in its own words', () => {
    expect(badge('paid')).toEqual({ kind: 'badge', status: 'Paid', label: undefined })
    expect(badge('pending')).toEqual({ kind: 'badge', status: 'Pending', label: undefined })
    expect(badge('failed')).toEqual({ kind: 'badge', status: 'Failed', label: undefined })
    expect(badge('refunded')).toEqual({ kind: 'badge', status: 'Refunded', label: undefined })
  })

  it('words the states the shared vocabulary has no entry for', () => {
    expect(badge('held')).toEqual({ kind: 'badge', status: 'Held', label: 'On hold' })
    expect(badge('released')).toEqual({ kind: 'badge', status: 'Cancelled', label: 'Released' })
    expect(badge('partly_refunded')).toEqual({ kind: 'badge', status: 'Refunded', label: 'Refunded $50' })
  })

  it('shows a dash while a link has no method yet', () => {
    const row = paymentRow({ ...payment, method: undefined }, LABELS, [])

    expect(row.cells[METHOD_CELL]).toEqual({ kind: 'text', primary: '—' })
  })
})

describe('payment state wording', () => {
  it('borrows the shared vocabulary for the four states it names', () => {
    const shared = (['paid', 'pending', 'failed', 'refunded'] as const).map((state) => [
      isOwnWorded(state),
      sharedStatus(state),
    ])

    expect(shared).toEqual([
      [false, 'Paid'],
      [false, 'Pending'],
      [false, 'Failed'],
      [false, 'Refunded'],
    ])
  })

  it('words the other three itself, since their shared colour is not their name', () => {
    // 'Cancelled' is only released's grey: shown as its label it would misname the deposit.
    expect((['held', 'released', 'partly_refunded'] as const).map(isOwnWorded)).toEqual([true, true, true])
    expect(sharedStatus('released')).toBe('Cancelled')
  })
})

describe('payment receipt', () => {
  it('is offered only where money was taken', () => {
    const offered = (state: PaymentRowState) => hasReceipt({ ...payment, state })

    expect((['paid', 'refunded', 'partly_refunded'] as const).map(offered)).toEqual([true, true, true])
    expect((['pending', 'failed', 'held', 'released'] as const).map(offered)).toEqual([
      false,
      false,
      false,
      false,
    ])
  })

  it('names the file as the API numbers the receipt', () => {
    const cash = { ...payment, id: '7b537e6b-90c1-4d2e-8f3a-5b6c7d8e9f01', bookingReference: 'BK-10002' }

    expect(paymentReceiptFileName(cash)).toBe('RCT-BK-10002-7B537E6B.pdf')
  })
})

describe('payoutsCsv', () => {
  const payout: Payout = {
    id: 'po_1',
    status: 'failed',
    amount: 3823.18,
    currency: 'USD',
    arrivalDate: '2026-10-09',
    destination: 'STRIPE TEST BANK ·· 2227',
    failureMessage: 'Insufficient funds',
  }

  it('lists each payout under the header, with blanks for what Stripe left out', () => {
    const rows = payoutsCsv(
      [payout, { ...payout, id: 'po_2', destination: undefined, failureMessage: undefined }],
      {
        header: ['Arrival date', 'Status', 'Amount', 'Bank account', 'Note', 'Payout ID'],
        status: (status) => status.toUpperCase(),
        currency: (amount, currency) => `${currency} ${amount.toFixed(2)}`,
      },
    )

    expect(rows).toEqual([
      ['Arrival date', 'Status', 'Amount', 'Bank account', 'Note', 'Payout ID'],
      ['2026-10-09', 'FAILED', 'USD 3823.18', 'STRIPE TEST BANK ·· 2227', 'Insufficient funds', 'po_1'],
      ['2026-10-09', 'FAILED', 'USD 3823.18', '', '', 'po_2'],
    ])
  })
})

describe('paymentFiltersActive', () => {
  const none: PaymentFilters = {
    search: '',
    tab: 'All',
    state: 'Any',
    method: 'All',
    period: { from: '', to: '' },
  }

  it('is off for the whole list, so an empty one reads as "no payments yet"', () => {
    expect(paymentFiltersActive(none)).toBe(false)
    expect(paymentFiltersActive({ ...none, search: '   ' })).toBe(false)
  })

  it.each<[string, Partial<PaymentFilters>]>([
    ['a search', { search: 'vega' }],
    ['a tab', { tab: 'Failed' }],
    ['a status', { state: 'held' }],
    ['a method', { method: 'Cash' }],
    ['a period start', { period: { from: '2026-10-01', to: '' } }],
    ['a period end', { period: { from: '', to: '2026-10-31' } }],
  ])('is on for %s', (_, change) => {
    expect(paymentFiltersActive({ ...none, ...change })).toBe(true)
  })
})
