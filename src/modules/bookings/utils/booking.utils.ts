import type { TFunction } from 'i18next'
import type { Row, RowActionItem } from '@/components/data-display/record-table.types'
import { formatCurrencyIn, formatDateIn } from '@/i18n/formatters'
import { initials } from '@/utils/formatting'
import { durationHours } from './booking.pricing'
import type { Booking, BookingDraft, BookingTuple } from '../types/booking.types'

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

/**
 * A BookingTuple stores pre-formatted display strings, and the dashboard's seeded ones are
 * English ("Sep 14 · 09:30 → Sep 18", "4 days", "$1,240"). API bookings are rendered the same
 * way so the ordinal/total parsers in booking.filters.ts keep working. The tuple goes away once
 * the list page reads Booking objects directly.
 */
const TUPLE_LANGUAGE = 'en'

/** "Sep 14 · 09:30 → Sep 18". The time is shown for the pickup only — the list scans on dates. */
export function formatRentalWindow(pickupAt: string, returnAt: string): string {
  const pickup = new Date(pickupAt)
  const dropoff = new Date(returnAt)
  const day = { month: 'short', day: 'numeric' } as const
  const time = formatDateIn(TUPLE_LANGUAGE, pickup, { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${formatDateIn(TUPLE_LANGUAGE, pickup, day)} · ${time} → ${formatDateIn(TUPLE_LANGUAGE, dropoff, day)}`
}

/** "4 days" — the secondary line under the rental window. Always at least one day. */
export function formatRentalDuration(pickupAt: string, returnAt: string): string {
  const days = Math.max(1, Math.ceil(durationHours(pickupAt, returnAt) / 24))
  return `${days} ${days === 1 ? 'day' : 'days'}`
}

/** Flattens a Booking into the tuple the list table renders. */
export function bookingToTuple(b: Booking): BookingTuple {
  return [
    b.customer.name,
    b.reference,
    b.vehicleName,
    b.vehiclePlate,
    formatRentalWindow(b.pickupAt, b.returnAt),
    formatRentalDuration(b.pickupAt, b.returnAt),
    b.pickupLocation,
    b.status,
    formatCurrencyIn(TUPLE_LANGUAGE, b.pricing.total),
    b.pickupAt,
    b.returnAt,
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
export function downloadBookingsCsv(
  bookings: BookingTuple[],
  filename: string,
  t: TFunction<'bookings'>,
): void {
  // Only the nine display columns the header names: the tuple also carries the raw pickup and
  // return instants, which are there for filtering, not for the exported file.
  const rows = bookings.map((row) => row.slice(0, 9) as string[])
  const csv = [csvHeader(t), ...rows].map((row) => row.map(toCsvCell).join(',')).join('\r\n')
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

/** `actions` is optional — read-only tables (dashboard, vehicle history) render the inert "…" button. */
export function bookingRow(b: BookingTuple, actions?: RowActionItem[]): Row {
  const [customer, reference, vehicle, plate, window, note, location, status, total] = b

  return {
    key: reference,
    cells: [
      {
        kind: 'avatar',
        primary: customer,
        secondary: reference,
        initials: initials(customer),
        avatarBg: 'var(--color-surface-3)',
        avatarFg: 'var(--color-fg-2)',
        avatarRadius: '99px',
        subFontMono: true,
      },
      { kind: 'stack', primary: vehicle, secondary: plate, weight: 500, subFontMono: true },
      { kind: 'stack', primary: window, secondary: note, weight: 500, subFontMono: false },
      { kind: 'text', primary: location },
      { kind: 'badge', status },
      {
        kind: 'amount',
        primary: total,
        align: 'right',
        tone: total.charAt(0) === '−' ? 'var(--color-fg-3)' : 'var(--color-foreground)',
      },
      { kind: 'actions', align: 'right', items: actions },
    ],
  }
}

/** The Drafts tab's own columns — a draft has no reference, status or total to show. */
export function draftColumns(t: TFunction<'bookings'>) {
  return [
    { label: t('columns.customer'), align: 'left' as const },
    { label: t('columns.rentalWindow'), align: 'left' as const },
    { label: t('columns.location'), align: 'left' as const },
    { label: t('list.drafts.savedColumn'), align: 'left' as const },
    { label: '', align: 'right' as const },
  ]
}

/**
 * One row per saved draft. Everything is read defensively: the payload is whatever the wizard
 * happened to hold when it was saved, so a draft abandoned on the first step has almost
 * nothing in it, and an older one may predate a field entirely.
 */
export function draftRow(
  draft: BookingDraft,
  t: TFunction<'bookings'>,
  savedLabel: string,
  actions?: RowActionItem[],
): Row {
  const payload = draft.payload as Partial<Record<string, string>>
  const customer = payload.customerName?.trim() || t('list.drafts.noCustomer')
  const window =
    payload.pickupDate && payload.returnDate
      ? `${payload.pickupDate} → ${payload.returnDate}`
      : (payload.pickupDate ?? t('list.drafts.noDates'))

  return {
    key: draft.id,
    cells: [
      {
        kind: 'avatar',
        primary: customer,
        secondary: draft.reference,
        initials: initials(customer),
        avatarBg: 'var(--color-surface-3)',
        avatarFg: 'var(--color-fg-2)',
        avatarRadius: '99px',
      },
      { kind: 'text', primary: window },
      { kind: 'text', primary: payload.pickupLocation || '—' },
      { kind: 'text', primary: savedLabel },
      { kind: 'actions', align: 'right', items: actions },
    ],
  }
}
