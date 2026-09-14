import type { Row } from '@/components/data-display/record-table.types'
import { initials } from '@/utils/formatting'
import type { CustomerTuple } from '../types/customer.types'

export function customerColumns() {
  return [
    { label: 'Customer', align: 'left' as const },
    { label: 'Phone', align: 'left' as const },
    { label: 'Driver licence', align: 'left' as const },
    { label: 'Rentals', align: 'left' as const },
    { label: 'Status', align: 'left' as const },
    { label: 'Lifetime value', align: 'right' as const },
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
