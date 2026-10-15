import type { ID } from '@/types/common'
import type { MembershipRole } from '@/types/user'

export const MEMBERSHIP_ROLES = ['owner', 'manager', 'staff'] as const satisfies readonly MembershipRole[]

export interface Member {
  userId: ID
  fullName: string
  email: string
  role: MembershipRole
  joinedAt: string
  isYou: boolean
}

export interface Invitation {
  id: ID
  email: string
  role: MembershipRole
  invitedByName?: string
  createdAt: string
  expiresAt: string
  expired: boolean
}

/** What creating or resending an invitation returns: the link exists nowhere else. */
export interface SentInvitation extends Invitation {
  inviteUrl: string
  emailQueued: boolean
}

export interface InviteInput {
  email: string
  role: MembershipRole
}

/** What an invitation link shows before anyone signs in. */
export interface InvitationPreview {
  id: ID
  companyName: string
  logoUrl?: string
  email: string
  role: MembershipRole
  expired: boolean
}

/** An invitation addressed to the signed-in account's verified email. */
export interface MyInvitation {
  id: ID
  companyName: string
  logoUrl?: string
  role: MembershipRole
  expiresAt: string
  expired: boolean
}
