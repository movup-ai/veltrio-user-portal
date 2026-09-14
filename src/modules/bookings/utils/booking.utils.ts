import type { Row } from '@/components/data-display/record-table.types'
import { initials } from '@/utils/formatting'
import type { BookingTuple } from '../types/booking.types'

export function bookingColumns() {
  return [
    { label: 'Customer', align: 'left' as const },
    { label: 'Vehicle', align: 'left' as const },
    { label: 'Rental window', align: 'left' as const },
    { label: 'Location', align: 'left' as const },
    { label: 'Status', align: 'left' as const },
    { label: 'Total', align: 'right' as const },
    { label: '', align: 'right' as const },
  ]
}

export function bookingRow(b: BookingTuple): Row {
  const [customer, reference, vehicle, plate, window, note, location, status, total] = b

  return {
    key: reference,
    cells: [
      { kind: 'avatar', primary: customer, secondary: reference, initials: initials(customer), avatarBg: 'var(--color-surface-3)', avatarFg: 'var(--color-fg-2)', avatarRadius: '99px', subFontMono: true },
      { kind: 'stack', primary: vehicle, secondary: plate, weight: 500, subFontMono: true },
      { kind: 'stack', primary: window, secondary: note, weight: 500, subFontMono: false },
      { kind: 'text', primary: location },
      { kind: 'badge', status },
      { kind: 'amount', primary: total, align: 'right', tone: total.charAt(0) === '−' ? 'var(--color-fg-3)' : 'var(--color-foreground)' },
      { kind: 'actions', align: 'right' },
    ],
  }
}
