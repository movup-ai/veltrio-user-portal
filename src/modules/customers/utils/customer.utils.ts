import type { TFunction } from 'i18next'
import type { Row } from '@/components/data-display/record-table.types'
import { initials } from '@/utils/formatting'
import type { CustomerTuple } from '../types/customer.types'

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

export function customerRow(c: CustomerTuple): Row {
  const [name, email, phone, licence, rentals, lifetimeValue, status] = c

  return {
    key: email,
    cells: [
      { kind: 'avatar', primary: name, secondary: email, initials: initials(name), avatarBg: 'var(--color-tint)', avatarFg: 'var(--color-primary)', avatarRadius: '99px', subFontMono: false },
      { kind: 'text', primary: phone },
      { kind: 'text', primary: licence },
      { kind: 'text', primary: rentals },
      { kind: 'badge', status },
      { kind: 'amount', primary: lifetimeValue, align: 'right', tone: 'var(--color-foreground)' },
      { kind: 'actions', align: 'right' },
    ],
  }
}
