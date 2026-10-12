import type { TFunction } from 'i18next'
import type { Row, RowActionItem } from '@/components/data-display/record-table.types'
import type { PaymentRow, PaymentRowState, Payout } from '../types/payment.types'

export function paymentColumns(t: TFunction<'payments'>) {
  return [
    { label: t('columns.payment'), align: 'left' as const },
    { label: t('columns.customer'), align: 'left' as const },
    { label: t('columns.method'), align: 'left' as const },
    { label: t('columns.status'), align: 'left' as const },
    { label: t('columns.amount'), align: 'right' as const },
    { label: '', align: 'right' as const },
  ]
}

/** The shared status each state borrows its colours from, and its words where it has them. */
const SHARED_STATUS: Record<PaymentRowState, string> = {
  paid: 'Paid',
  pending: 'Pending',
  failed: 'Failed',
  held: 'Held',
  released: 'Cancelled',
  refunded: 'Refunded',
  partly_refunded: 'Refunded',
}

interface RowLabels {
  kind: string
  date: string
  amount: string
  /** The three states the shared status vocabulary has no words for. */
  held: string
  released: string
  partlyRefunded: string
}

export function sharedStatus(state: PaymentRowState): string {
  return SHARED_STATUS[state]
}

type OwnWordedState = 'held' | 'released' | 'partly_refunded'

/** These borrow a colour whose name is not theirs, so the payments namespace words them. */
export function isOwnWorded(state: PaymentRowState): state is OwnWordedState {
  return state === 'held' || state === 'released' || state === 'partly_refunded'
}

function badgeLabel(state: PaymentRowState, labels: RowLabels): string | undefined {
  if (state === 'held') return labels.held
  if (state === 'released') return labels.released
  if (state === 'partly_refunded') return labels.partlyRefunded
  return undefined
}

/** Keyed on the payment, not the booking: one booking has several payments. */
export function paymentRow(p: PaymentRow, labels: RowLabels, actions: RowActionItem[]): Row {
  return {
    key: p.id,
    cells: [
      { kind: 'stack', primary: labels.kind, secondary: labels.date, weight: 600, subFontMono: true },
      {
        kind: 'stack',
        primary: p.customerName,
        secondary: p.bookingReference,
        weight: 500,
        subFontMono: true,
      },
      { kind: 'text', primary: p.method ?? '—' },
      { kind: 'badge', status: SHARED_STATUS[p.state], label: badgeLabel(p.state, labels) },
      {
        kind: 'amount',
        primary: labels.amount,
        align: 'right',
        tone: p.state === 'refunded' ? 'var(--color-fg-3)' : 'var(--color-foreground)',
      },
      { kind: 'actions', align: 'right', items: actions },
    ],
  }
}

/** A receipt says what was received, so a link nobody paid or a deposit only held has none. */
export function hasReceipt(p: PaymentRow): boolean {
  return p.state === 'paid' || p.state === 'refunded' || p.state === 'partly_refunded'
}

/** Mirrors `payment_receipt_number` in the API (app/modules/payments/documents.py). */
export function paymentReceiptFileName(p: PaymentRow): string {
  return `RCT-${p.bookingReference}-${p.id.replaceAll('-', '').slice(0, 8).toUpperCase()}.pdf`
}

interface PayoutCsvLabels {
  header: string[]
  status: (status: string) => string
  currency: (amount: number, currency: string) => string
}

/** The payout report as rows for a CSV. The arrival day stays `YYYY-MM-DD`, which sorts. */
export function payoutsCsv(payouts: Payout[], labels: PayoutCsvLabels): string[][] {
  const rows = payouts.map((p) => [
    p.arrivalDate,
    labels.status(p.status),
    labels.currency(p.amount, p.currency),
    p.destination ?? '',
    p.failureMessage ?? '',
    p.id,
  ])
  return [labels.header, ...rows]
}
