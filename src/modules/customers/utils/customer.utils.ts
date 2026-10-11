import type { TFunction } from 'i18next'
import type { Row, RowActionItem } from '@/components/data-display/record-table.types'
import { initials } from '@/utils/formatting'
import type { CustomerRow } from '../types/customer.types'

export function customerColumns(t: TFunction<'customers'>) {
  return [
    { label: t('columns.customer'), align: 'left' as const },
    { label: t('columns.phone'), align: 'left' as const },
    { label: t('columns.licence'), align: 'left' as const },
    { label: t('columns.rentals'), align: 'left' as const },
    { label: t('columns.status'), align: 'left' as const },
    { label: t('columns.lifetimeValue'), align: 'right' as const },
    { label: '', align: 'right' as const },
  ]
}

interface RowLabels {
  possibleDuplicate: string
  lifetimeValue: string
}

/** Keyed on the id, not the email: the row opens the customer, and an email can be edited. */
export function customerRow(c: CustomerRow, labels: RowLabels, actions: RowActionItem[]): Row {
  return {
    key: c.id,
    cells: [
      {
        kind: 'avatar',
        primary: c.name,
        secondary: c.email,
        initials: initials(c.name),
        avatarBg: 'var(--color-tint)',
        avatarFg: 'var(--color-primary)',
        avatarRadius: '99px',
        subFontMono: false,
      },
      { kind: 'text', primary: c.phone },
      { kind: 'text', primary: c.licenceNumber },
      { kind: 'text', primary: String(c.rentals) },
      c.possibleDuplicate
        ? // The warning colours of 'Verify docs', under this row's own wording.
          { kind: 'badge', status: 'Verify docs', label: labels.possibleDuplicate }
        : { kind: 'badge', status: 'Active' },
      { kind: 'amount', primary: labels.lifetimeValue, align: 'right', tone: 'var(--color-foreground)' },
      { kind: 'actions', align: 'right', items: actions },
    ],
  }
}

/**
 * Of the customers who have rented, the whole percentage who rented again. Measured over
 * `rented`, not the whole book: someone added by hand has not yet had the chance to return.
 */
export function repeatRate(repeat: number, rented: number): number {
  return rented === 0 ? 0 : Math.round((repeat / rented) * 100)
}

interface CsvLabels {
  header: string[]
  active: string
  possibleDuplicate: string
  /** The company's currency, as the table shows it. */
  currency: (amount: number) => string
}

/** The customer list as rows for a CSV: the table's own columns, with the email in its own. */
export function customersCsv(customers: CustomerRow[], labels: CsvLabels): string[][] {
  const rows = customers.map((c) => [
    c.name,
    c.email,
    c.phone,
    c.licenceNumber,
    String(c.rentals),
    c.possibleDuplicate ? labels.possibleDuplicate : labels.active,
    labels.currency(c.lifetimeValue),
  ])
  return [labels.header, ...rows]
}
