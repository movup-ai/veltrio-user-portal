import { useOrganizationStore } from '@/state/organization.store'
import { hasAnyPermission } from '@/utils/permissions'
import type { Permission } from '@/types/user'

// Stable reference: a `?? []` fallback inline would allocate a new array on
// every selector call, which breaks Zustand's useSyncExternalStore equality
// check and causes an infinite re-render loop.
const NO_PERMISSIONS: Permission[] = []

export function usePermissions() {
  return useOrganizationStore((state) => state.activeMembership?.permissions ?? NO_PERMISSIONS)
}

interface CanProps {
  permission: Permission | Permission[]
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * UX-only visibility gate, e.g. `<Can permission="vehicles.create"><Button>Add Vehicle</Button></Can>`.
 * The backend must still enforce authorization independently.
 */
export function Can({ permission, fallback = null, children }: CanProps) {
  const granted = usePermissions()
  const required = Array.isArray(permission) ? permission : [permission]

  return hasAnyPermission(granted, required) ? children : fallback
}
