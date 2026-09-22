import type { MembershipRole, Permission } from '@/types/user'

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

/**
 * The backend grants a role per tenant, not permission strings, so the UI's
 * finer-grained gates are derived here. This is a UX convenience only: the API
 * re-checks the role with `require_role` on every request, and widening a role
 * here grants nothing.
 *
 * The split that matters is `vehicles.create` / `vehicles.delete`, which the API
 * restricts to owner and manager (app/modules/vehicles/router.py). Can.test.tsx
 * pins it, because a drift either hides a button that works or offers one the
 * API answers with 403. The rest are not enforced anywhere yet — the endpoints
 * they describe do not exist.
 */
export const ROLE_PERMISSIONS: Record<MembershipRole, Permission[]> = {
  owner: [
    'vehicles.read',
    'vehicles.create',
    'vehicles.update',
    'vehicles.delete',
    'bookings.read',
    'bookings.create',
    'bookings.update',
    'bookings.cancel',
    'customers.read',
    'customers.create',
    'customers.update',
    'payments.read',
    'payments.refund',
    'locations.read',
    'locations.manage',
    'pricing.read',
    'pricing.manage',
    'settings.manage',
    'users.manage',
  ],
  // Runs the business day to day, but cannot change the organization itself.
  manager: [
    'vehicles.read',
    'vehicles.create',
    'vehicles.update',
    'vehicles.delete',
    'bookings.read',
    'bookings.create',
    'bookings.update',
    'bookings.cancel',
    'customers.read',
    'customers.create',
    'customers.update',
    'payments.read',
    'payments.refund',
    'locations.read',
    'locations.manage',
    'pricing.read',
    'pricing.manage',
  ],
  // Front desk: works the daily flow, no destructive or money-moving actions.
  staff: [
    'vehicles.read',
    'vehicles.update',
    'bookings.read',
    'bookings.create',
    'bookings.update',
    'customers.read',
    'customers.create',
    'customers.update',
    'payments.read',
    'locations.read',
    'pricing.read',
  ],
}
