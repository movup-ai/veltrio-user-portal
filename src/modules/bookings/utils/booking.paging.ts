import type { BookingFilters, BookingSort, BookingTab } from '../types/booking.types'

/**
 * Identity of a result set, for deciding when paging must restart.
 *
 * Page 4 of one result set is rarely page 4 of another, and at a larger page size it may not
 * exist at all — so anything that changes which rows come back resets to page 1.
 */
export function resultSetKey(
  filters: BookingFilters,
  tab: BookingTab,
  sort: BookingSort,
  pageSize: number,
): string {
  return JSON.stringify([filters, tab, sort, pageSize])
}
