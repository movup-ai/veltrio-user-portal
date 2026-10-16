import type { VehicleListTab } from '../constants/vehicle-list.constants'
import type { VehicleListParams } from '../types/vehicle.types'

export type VehicleListEmptyKind = 'firstRun' | 'allArchived' | 'noMatches' | 'emptyTab'

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

/** Counts are undefined until they load; nothing is concluded from them before then. */
export function vehicleListEmptyKind({
  tab,
  filtersActive,
  active,
  archived,
}: {
  tab: VehicleListTab
  filtersActive: boolean
  active: number | undefined
  archived: number | undefined
}): VehicleListEmptyKind {
  // Drafts ignore the search and filters, so "no matches" would point at the wrong cause.
  if (tab === 'Drafts') return 'emptyTab'
  if (active === 0 && archived === 0) return 'firstRun'
  // Nothing active to filter or to be in any status: the cause is that it was all archived.
  if (active === 0 && archived !== undefined && archived > 0 && tab !== 'Archived') return 'allArchived'
  return filtersActive ? 'noMatches' : 'emptyTab'
}
