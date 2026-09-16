import type { TFunction } from 'i18next'
import type { Row } from '@/components/data-display/record-table.types'
import type { PaymentTuple } from '../types/payment.types'

export function paymentColumns(t: TFunction<'payments'>) {
  return [
    { label: t('columns.invoice'), align: 'left' as const },
    { label: t('columns.customer'), align: 'left' as const },
    { label: t('columns.method'), align: 'left' as const },
    { label: t('columns.status'), align: 'left' as const },
    { label: t('columns.amount'), align: 'right' as const },
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
