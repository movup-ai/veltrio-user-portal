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

/** Parses a formatted total like "$1,240" or "−$310" into a signed number. */
export function parseBookingTotal(total: string): number {
  const negative = total.trim().startsWith('−') || total.trim().startsWith('-')
  const amount = Number(total.replace(/[^0-9.]/g, ''))
  return negative ? -amount : amount
}

const CSV_HEADER = ['Customer', 'Reference', 'Vehicle', 'Plate', 'Rental window', 'Note', 'Location', 'Status', 'Total']

function toCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

/** Builds a CSV from booking tuples and triggers a browser download — no backend export endpoint yet. */
export function downloadBookingsCsv(bookings: BookingTuple[], filename: string): void {
  const csv = [CSV_HEADER, ...bookings].map((row) => row.map(toCsvCell).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
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
