import { create } from 'zustand'
import type { OrganizationMembership } from '@/types/user'

/**
 * The company the signed-in user belongs to.
 *
 * There is exactly one, so there is nothing to select and nothing to remember between
 * sessions: the API derives the tenant from the token (`uq_tenant_memberships_user_id`) and
 * a request cannot name a different one. Kept in a store rather than read off the `me` query
 * because non-React callers need it too.
 */
interface OrganizationState {
  membership: OrganizationMembership | null
  /** Called after login/session-restore with whatever `GET /auth/me` returned. */
  setMembership: (membership: OrganizationMembership | null) => void
}

export const useOrganizationStore = create<OrganizationState>((set) => ({
  membership: null,
  setMembership: (membership) => set({ membership }),
}))
