import { describe, expect, it } from 'vitest'
import type { VehiclePriceBand } from '../types/vehicle.types'
import { vehicleFiltersActive, vehicleListEmptyKind } from './vehicle-list-empty'

const NO_FILTERS = {
  search: undefined,
  status: 'Any' as const,
  location: 'All',
  vehicleType: 'All' as const,
  transmission: 'Any' as const,
  fuelType: 'Any' as const,
  priceBands: [] as VehiclePriceBand[],
}

describe('vehicleFiltersActive', () => {
  it('is false with nothing narrowed', () => {
    expect(vehicleFiltersActive(NO_FILTERS, 'All')).toBe(false)
  })

  it('does not count the status a tab pins as a filter', () => {
    expect(vehicleFiltersActive({ ...NO_FILTERS, status: 'Archived' }, 'Archived')).toBe(false)
    expect(vehicleFiltersActive({ ...NO_FILTERS, status: 'Maintenance' }, 'Maintenance')).toBe(false)
  })

  it('counts a status filter on the All tab, a search and the other filters', () => {
    expect(vehicleFiltersActive({ ...NO_FILTERS, status: 'Available' }, 'All')).toBe(true)
    expect(vehicleFiltersActive({ ...NO_FILTERS, search: 'civic' }, 'Archived')).toBe(true)
    expect(vehicleFiltersActive({ ...NO_FILTERS, location: 'Downtown' }, 'On rent')).toBe(true)
    expect(vehicleFiltersActive({ ...NO_FILTERS, priceBands: ['0-50'] }, 'All')).toBe(true)
  })
})

describe('vehicleListEmptyKind', () => {
  const fleet = { active: 4, archived: 1 }

  it('gives an empty tab its own copy when nothing is filtered', () => {
    expect(vehicleListEmptyKind({ tab: 'Archived', filtersActive: false, ...fleet })).toBe('emptyTab')
    expect(vehicleListEmptyKind({ tab: 'Maintenance', filtersActive: false, ...fleet })).toBe('emptyTab')
  })

  it('says "no matches" only when a search or filter is active', () => {
    expect(vehicleListEmptyKind({ tab: 'Archived', filtersActive: true, ...fleet })).toBe('noMatches')
  })

  it('never blames the filters for an empty Drafts tab, which they do not apply to', () => {
    expect(vehicleListEmptyKind({ tab: 'Drafts', filtersActive: true, ...fleet })).toBe('emptyTab')
    expect(vehicleListEmptyKind({ tab: 'Drafts', filtersActive: false, active: 0, archived: 0 })).toBe(
      'emptyTab',
    )
  })

  it('keeps the first-run state for a company with no vehicles at all', () => {
    expect(vehicleListEmptyKind({ tab: 'All', filtersActive: true, active: 0, archived: 0 })).toBe('firstRun')
  })

  it('says every vehicle is archived on a status tab, rather than guessing at their statuses', () => {
    const onlyArchived = { active: 0, archived: 3 }
    for (const tab of ['All', 'Available', 'On rent', 'Maintenance'] as const) {
      expect(vehicleListEmptyKind({ tab, filtersActive: false, ...onlyArchived })).toBe('allArchived')
      // Nothing active to filter, so the filters are not the reason either.
      expect(vehicleListEmptyKind({ tab, filtersActive: true, ...onlyArchived })).toBe('allArchived')
    }
    expect(vehicleListEmptyKind({ tab: 'Archived', filtersActive: true, ...onlyArchived })).toBe('noMatches')
  })

  it('concludes nothing from counts that have not loaded', () => {
    const loading = { active: undefined, archived: undefined }
    expect(vehicleListEmptyKind({ tab: 'Available', filtersActive: false, ...loading })).toBe('emptyTab')
  })
})
