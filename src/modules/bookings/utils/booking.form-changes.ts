import type { BookingFormValues } from '../schema/booking.schema'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

// A File has no own keys, so it is compared by identity: two different scans would otherwise match.
function same(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => same(v, b[i]))
  if (!isPlainObject(a) || !isPlainObject(b)) return false
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...keys].every((key) => same(a[key], b[key]))
}

/**
 * Whether leaving the wizard would lose anything entered since it opened. Compared by value
 * rather than RHF's `isDirty`: picking a vehicle or a location's return branch goes through
 * `setValue`, which does not mark the form dirty.
 */
export function bookingFormChanged(values: BookingFormValues, initial: BookingFormValues): boolean {
  return !same(values, initial)
}
