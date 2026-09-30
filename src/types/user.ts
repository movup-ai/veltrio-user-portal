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
  | 'verifications.delete'
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
 * A user's place in their organization. There is exactly one per account, so role and
 * permissions always resolve through it.
 */
export interface OrganizationMembership {
  organizationId: ID
  organizationName: string
  /** Tenant subdomain, used to build public customer-portal links. */
  subdomain: string
  role: MembershipRole
  permissions: Permission[]
}
