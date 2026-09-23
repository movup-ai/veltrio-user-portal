import { Car } from 'lucide-react'
import type { TFunction } from 'i18next'
import type { Row, RowActionItem } from '@/components/data-display/record-table.types'
import { formatCurrencyIn, formatDateIn } from '@/i18n/formatters'
import { durationHours } from './booking.pricing'
import { isReadyForPickup, type Booking, type BookingDraft, type BookingTuple } from '../types/booking.types'

export function bookingColumns(t: TFunction<'bookings'>) {
  return [
    { label: t('columns.vehicle'), align: 'left' as const },
    { label: t('columns.bookingId'), align: 'left' as const },
    { label: t('columns.customer'), align: 'left' as const },
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

/**
 * "Sep 14 · 09:30 → Sep 18 · 14:00". Both ends carry their time: a counter handing over a car
 * needs the return hour as much as the pickup one, and "→ Sep 18" alone reads as end-of-day.
 */
export function formatRentalWindow(pickupAt: string, returnAt: string): string {
  const day = { month: 'short', day: 'numeric' } as const
  const clock = { hour: '2-digit', minute: '2-digit', hour12: false } as const
  const endpoint = (iso: string) => {
    const at = new Date(iso)
    return `${formatDateIn(TUPLE_LANGUAGE, at, day)} · ${formatDateIn(TUPLE_LANGUAGE, at, clock)}`
  }
  return `${endpoint(pickupAt)} → ${endpoint(returnAt)}`
}

/**
 * "3 days 4h" — the real length, not a rounded one. Rounding up turned every 24h rental into
 * "1 day" and hid the hours a late return is charged for, so the remainder is shown when there
 * is one. Always at least an hour, so a same-day booking still reads as a duration.
 */
export function formatRentalDuration(pickupAt: string, returnAt: string): string {
  const total = Math.max(1, Math.round(durationHours(pickupAt, returnAt)))
  const days = Math.floor(total / 24)
  const hours = total % 24
  const parts = []
  if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`)
  if (hours > 0) parts.push(`${hours}h`)
  return parts.join(' ')
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
    undefined, // vehicleImage — joined in from the fleet at render time
    b.vehicleId,
    isReadyForPickup(b),
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

/**
 * Attaches the car's cover thumbnail. Keyed on vehicle id, not plate: plates are not unique —
 * the same one can sit on several rows — so a plate lookup could show the wrong car's photo.
 * Returns the tuple unchanged when there is no photo, so the row falls back to the icon.
 */
export function withVehicleImage(b: BookingTuple, byVehicleId: Map<string, string>): BookingTuple {
  const vehicleId = b[12]
  const image = vehicleId ? byVehicleId.get(vehicleId) : undefined
  if (!image) return b
  const next = [...b] as BookingTuple
  next[11] = image
  return next
}

/** Only meaningful before the keys change hands; after that the status says enough. */
const PRE_PICKUP: readonly string[] = ['Pending', 'Confirmed']

/** Canonical label for the derived readiness badge — `domain:status.Ready` carries the text. */
const READY = 'Ready'

/** `actions` is optional — read-only tables (dashboard, vehicle history) render the inert "…" button. */
export function bookingRow(b: BookingTuple, actions?: RowActionItem[]): Row {
  const [customer, reference, vehicle, plate, window, note, location, status, total] = b
  const vehicleImage = b[11]
  const ready = b[13]

  return {
    key: reference,
    cells: [
      {
        kind: 'avatar',
        primary: vehicle,
        secondary: plate,
        // Never shown: the icon stands in when there is no photo, since initials read oddly
        // on a car.
        initials: '',
        imageUrl: vehicleImage,
        fallbackIcon: Car,
        avatarSize: 38,
        avatarBg: 'var(--color-surface-3)',
        avatarFg: 'var(--color-fg-3)',
        avatarRadius: '8px',
        subFontMono: true,
      },
      // Its own column: the reference is what a counter quotes on the phone, so it is read
      // across rows rather than hunted for under a name.
      { kind: 'text', primary: reference, fontMono: true },
      { kind: 'text', primary: customer },
      { kind: 'stack', primary: window, secondary: note, weight: 500, subFontMono: false },
      { kind: 'text', primary: location },
      // Two badges: where the rental is, and — while it is still ahead of pickup — whether
      // the paperwork is done. Readiness is derived, so it cannot contradict the row.
      { kind: 'badges', statuses: ready && PRE_PICKUP.includes(status) ? [status, READY] : [status] },
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
    { label: t('columns.bookingId'), align: 'left' as const },
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
      // Same shape as a booking row: the reference reads across rows, the name beside it.
      { kind: 'text', primary: draft.reference, fontMono: true },
      { kind: 'text', primary: customer },
      { kind: 'text', primary: window },
      { kind: 'text', primary: payload.pickupLocation || '—' },
      { kind: 'text', primary: savedLabel },
      { kind: 'actions', align: 'right', items: actions },
    ],
  }
}
