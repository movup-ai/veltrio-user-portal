import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'

function toDate(value: string | Date): Date {
  return typeof value === 'string' ? parseISO(value) : value
}

export function formatDate(value: string | Date, pattern = 'MMM d, yyyy'): string {
  const date = toDate(value)
  return isValid(date) ? format(date, pattern) : '—'
}

export function formatDateTime(value: string | Date): string {
  return formatDate(value, 'MMM d, yyyy h:mm a')
}

export function formatRelativeTime(value: string | Date): string {
  const date = toDate(value)
  return isValid(date) ? formatDistanceToNow(date, { addSuffix: true }) : '—'
}

/**
 * Calendar days (`YYYY-MM-DD`) converted in *local* time. `new Date('2026-03-12')` parses as
 * UTC midnight, which renders as the previous day anywhere west of Greenwich, and
 * `toISOString()` has the mirror problem going the other way.
 */
export function parseDay(isoDay: string): Date {
  const [year, month, day] = isoDay.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Today as `YYYY-MM-DD` in the viewer's own timezone. */
export function today(): string {
  return formatDay(new Date())
}
