import { apiClient } from '@/services/api/client'
import { ROLE_PERMISSIONS } from '@/utils/permissions'
import type { ID } from '@/types/common'
import type { MembershipRole, OrganizationMembership, User } from '@/types/user'

/** Self-reported band, not a count — mirrors the backend's FleetSize enum. */
export const FLEET_SIZES = ['1_10', '11_50', '51_200', '200_plus'] as const
export type FleetSize = (typeof FLEET_SIZES)[number]

/** One row of `GET /auth/me`'s `memberships` — a tenant the user belongs to. */
export interface TenantMembership {
  tenantId: ID
  tenantName: string
  subdomain: string
  role: MembershipRole
}

export interface MeResponse {
  user: User
  memberships: TenantMembership[]
}

export interface RegisterTenantPayload {
  tenantName: string
  subdomain: string
  timezone: string
  ownerFullName: string
  country: string
  fleetSize: FleetSize
  website?: string
}

export interface RegisterTenantResponse {
  tenant: { id: ID; name: string; subdomain: string; timezone: string }
  user: User
  role: MembershipRole
}

/** The portal's "organization" is the backend's tenant; permissions come from the role. */
export function toOrganizationMembership(membership: TenantMembership): OrganizationMembership {
  return {
    organizationId: membership.tenantId,
    organizationName: membership.tenantName,
    subdomain: membership.subdomain,
    role: membership.role,
    permissions: ROLE_PERMISSIONS[membership.role],
  }
}

/**
 * Identity itself lives in Clerk — there is no login endpoint here. These two
 * calls map a verified Clerk session onto the platform account: `/auth/me`
 * resolves it to a user plus tenant memberships, and `/auth/register-tenant`
 * creates them at the end of onboarding.
 *
 * Both always hit the real backend: VITE_USE_MOCKS covers business data, not the
 * session the rest of the app is gated on.
 */
export const authApi = {
  getMe: () => apiClient.get<MeResponse>('/auth/me').then((r) => r.data),

  registerTenant: (payload: RegisterTenantPayload) =>
    apiClient.post<RegisterTenantResponse>('/auth/register-tenant', payload).then((r) => r.data),
}
