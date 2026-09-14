import { create } from 'zustand'
import type { OrganizationMembership } from '@/types/user'

const ACTIVE_ORG_KEY = 'veltrio.active_organization_id'

interface OrganizationState {
  memberships: OrganizationMembership[]
  activeOrganizationId: string | null
  activeMembership: OrganizationMembership | null
  /** Called once after login/session-restore with every org the user belongs to. */
  setMemberships: (memberships: OrganizationMembership[]) => void
  switchOrganization: (organizationId: string) => void
}

export const useOrganizationStore = create<OrganizationState>((set, get) => ({
  memberships: [],
  activeOrganizationId: null,
  activeMembership: null,

  setMemberships: (memberships) => {
    const remembered = localStorage.getItem(ACTIVE_ORG_KEY)
    const active = memberships.find((m) => m.organizationId === remembered) ?? memberships[0] ?? null

    set({
      memberships,
      activeOrganizationId: active?.organizationId ?? null,
      activeMembership: active,
    })
  },

  switchOrganization: (organizationId) => {
    const membership = get().memberships.find((m) => m.organizationId === organizationId)
    if (!membership) return

    localStorage.setItem(ACTIVE_ORG_KEY, organizationId)
    set({ activeOrganizationId: organizationId, activeMembership: membership })
  },
}))
