import type { Permission } from '@/types/user'

/** UX-only gate — the backend enforces real authorization on every request. */
export function hasPermission(granted: Permission[], required: Permission): boolean {
  return granted.includes(required)
}

export function hasAnyPermission(granted: Permission[], required: Permission[]): boolean {
  return required.some((permission) => granted.includes(permission))
}

export function hasAllPermissions(granted: Permission[], required: Permission[]): boolean {
  return required.every((permission) => granted.includes(permission))
}
