import { describe, expect, it } from 'vitest'
import type { BookingFilters, BookingSort, BookingTab } from '../types/booking.types'
import { resultSetKey } from './booking.paging'

const FILTERS: BookingFilters = {
  search: '',
  status: 'Any',
  location: 'All',
  pickup: { from: '', to: '' },
  make: 'All',
  durationBand: 'Any',
  valueBands: [],
}

const key = (
  overrides: Partial<BookingFilters> = {},
  tab: BookingTab = 'Upcoming',
  sort: BookingSort = 'newest',
  size = 10,
) => resultSetKey({ ...FILTERS, ...overrides }, tab, sort, size)

describe('resultSetKey', () => {
  it('is stable when nothing that selects rows has changed', () => {
    expect(key()).toBe(key())
  })

  it('changes when a filter changes', () => {
    expect(key({ search: 'marisol' })).not.toBe(key())
    expect(key({ status: 'Confirmed' })).not.toBe(key())
    expect(key({ valueBands: ['0-250'] })).not.toBe(key())
  })

  it('changes when the tab or sort changes', () => {
    expect(key({}, 'Overdue')).not.toBe(key())
    expect(key({}, 'Upcoming', 'totalDesc')).not.toBe(key())
  })

  it('changes when the page size changes', () => {
    // The reason this matters: page 5 of 10-per-page does not exist at 100 per page, so
    // keeping the page number would land the counter on an empty table.
    expect(key({}, 'Upcoming', 'newest', 100)).not.toBe(key())
  })
})
