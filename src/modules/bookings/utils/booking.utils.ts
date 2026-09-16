import type { TFunction } from 'i18next'
import type { Row } from '@/components/data-display/record-table.types'
import { initials } from '@/utils/formatting'
import type { BookingTuple } from '../types/booking.types'

export function bookingColumns(t: TFunction<'bookings'>) {
  return [
    { label: t('columns.customer'), align: 'left' as const },
    { label: t('columns.vehicle'), align: 'left' as const },
    { label: t('columns.rentalWindow'), align: 'left' as const },
    { label: t('columns.location'), align: 'left' as const },
    { label: t('columns.status'), align: 'left' as const },
    { label: t('columns.total'), align: 'right' as const },
    { label: '', align: 'right' as const },
  ]
}

/** Parses a formatted total like "$1,240" or "−$310" into a signed number. */
export function parseBookingTotal(total: string): number {
  const negative = total.trim().startsWith('−') || total.trim().startsWith('-')
  const amount = Number(total.replace(/[^0-9.]/g, ''))
  return negative ? -amount : amount
}

function csvHeader(t: TFunction<'bookings'>): string[] {
  return [
    t('csv.customer'),
    t('csv.reference'),
    t('csv.vehicle'),
    t('csv.plate'),
    t('csv.rentalWindow'),
    t('csv.note'),
    t('csv.location'),
    t('csv.status'),
    t('csv.total'),
  ]
}

function toCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

/** Builds a CSV from booking tuples and triggers a browser download — no backend export endpoint yet. */
export function downloadBookingsCsv(bookings: BookingTuple[], filename: string, t: TFunction<'bookings'>): void {
  const csv = [csvHeader(t), ...bookings].map((row) => row.map(toCsvCell).join(',')).join('\r\n')
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
