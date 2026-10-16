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
  it('gives an empty tab its own copy when nothing is filtered', () => {
    expect(vehicleListEmptyKind({ tab: 'Archived', filtersActive: false, fleetEmpty: false })).toBe(
      'emptyTab',
    )
    expect(vehicleListEmptyKind({ tab: 'Maintenance', filtersActive: false, fleetEmpty: false })).toBe(
      'emptyTab',
    )
  })

  it('says "no matches" only when a search or filter is active', () => {
    expect(vehicleListEmptyKind({ tab: 'Archived', filtersActive: true, fleetEmpty: false })).toBe(
      'noMatches',
    )
  })

  it('never blames the filters for an empty Drafts tab, which they do not apply to', () => {
    expect(vehicleListEmptyKind({ tab: 'Drafts', filtersActive: true, fleetEmpty: false })).toBe('emptyTab')
    expect(vehicleListEmptyKind({ tab: 'Drafts', filtersActive: false, fleetEmpty: true })).toBe('emptyTab')
  })

  it('keeps the first-run state for a company with no vehicles at all', () => {
    expect(vehicleListEmptyKind({ tab: 'All', filtersActive: true, fleetEmpty: true })).toBe('firstRun')
  })
})
