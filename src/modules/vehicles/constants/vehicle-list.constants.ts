/** Canonical values — `All` means "no status filter", `Drafts` filters on isDraft instead of status, the rest map 1:1 to VehicleStatus. */
export const VEHICLE_LIST_TABS = ['All', 'Available', 'On rent', 'Maintenance', 'Drafts', 'Archived'] as const
export type VehicleListTab = (typeof VEHICLE_LIST_TABS)[number]
