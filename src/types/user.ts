import type { ID } from './common'

/**
 * Permission strings are the source of truth for frontend UX gating
 * (see utils/permissions.ts and components/feedback/Can.tsx). The backend
 * is the only real authorization boundary — these checks only hide/show UI.
 */
export type Permission =
  | 'vehicles.read'
  | 'vehicles.create'
  | 'vehicles.update'
  | 'vehicles.delete'
  | 'bookings.read'
  | 'bookings.create'
  | 'bookings.update'
  | 'bookings.cancel'
  | 'customers.read'
  | 'customers.create'
  | 'customers.update'
  | 'payments.read'
  | 'payments.refund'
  | 'locations.read'
  | 'locations.manage'
  | 'pricing.read'
  | 'pricing.manage'
  | 'settings.manage'
  | 'users.manage'

/** Mirrors the backend's MembershipRole (app/modules/users/models.py). */
export type MembershipRole = 'owner' | 'manager' | 'staff'

export interface User {
  id: ID
  email: string
  fullName: string
  avatarUrl?: string
}

/**
 * A user's membership in one organization. A user may hold memberships in
 * several organizations at once — never assume `user.role` is sufficient;
 * always resolve role/permissions through the *active* membership.
 */
export interface OrganizationMembership {
  organizationId: ID
  organizationName: string
  role: MembershipRole
  permissions: Permission[]
}
