import type { Row } from '@/components/data-display/record-table.types'
import type { PaymentTuple } from '../types/payment.types'

export function paymentColumns() {
  return [
    { label: 'Invoice', align: 'left' as const },
    { label: 'Customer', align: 'left' as const },
    { label: 'Method', align: 'left' as const },
    { label: 'Status', align: 'left' as const },
    { label: 'Amount', align: 'right' as const },
    { label: '', align: 'right' as const },
  ]
}

export function paymentRow(p: PaymentTuple): Row {
  const [invoice, date, customer, bookingRef, method, status, amount] = p

  return {
    key: invoice,
    cells: [
      { kind: 'stack', primary: invoice, secondary: date, weight: 600, subFontMono: true },
      { kind: 'stack', primary: customer, secondary: bookingRef, weight: 500, subFontMono: true },
      { kind: 'text', primary: method },
      { kind: 'badge', status },
      { kind: 'amount', primary: amount, align: 'right', tone: amount.charAt(0) === '−' ? 'var(--color-fg-3)' : 'var(--color-foreground)' },
      { kind: 'actions', align: 'right' },
    ],
  }
}
