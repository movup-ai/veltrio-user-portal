import type { VehicleListTab } from '../constants/vehicle-list.constants'
import type { VehicleListParams } from '../types/vehicle.types'

export type VehicleListEmptyKind = 'firstRun' | 'noMatches' | 'emptyTab'

/** A status tab pins the status itself, so the status filter only narrows the All tab. */
export function vehicleFiltersActive(
  params: Omit<VehicleListParams, 'page' | 'pageSize'>,
  tab: VehicleListTab,
): boolean {
  return (
    Boolean(params.search) ||
    (params.location ?? 'All') !== 'All' ||
    (params.vehicleType ?? 'All') !== 'All' ||
    (params.transmission ?? 'Any') !== 'Any' ||
    (params.fuelType ?? 'Any') !== 'Any' ||
    (params.priceBands ?? []).length > 0 ||
    (tab === 'All' && (params.status ?? 'Any') !== 'Any')
  )
}

export function vehicleListEmptyKind({
  tab,
  filtersActive,
  fleetEmpty,
}: {
  tab: VehicleListTab
  filtersActive: boolean
  fleetEmpty: boolean
}): VehicleListEmptyKind {
  // Drafts ignore the search and filters, so "no matches" would point at the wrong cause.
  if (tab === 'Drafts') return 'emptyTab'
  if (fleetEmpty) return 'firstRun'
  return filtersActive ? 'noMatches' : 'emptyTab'
}
