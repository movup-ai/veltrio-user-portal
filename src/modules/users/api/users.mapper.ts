import type { MembershipRole } from '@/types/user'
import type {
  Invitation,
  InvitationPreview,
  Member,
  MyInvitation,
  SentInvitation,
} from '../types/users.types'

// Roles travel as the same slugs on both sides; only `null` ↔ `undefined` is translated.
export type MemberWire = Member

export interface InvitationWire {
  id: string
  email: string
  role: MembershipRole
  invitedByName: string | null
  createdAt: string
  expiresAt: string
  expired: boolean
}

export interface SentInvitationWire extends InvitationWire {
  inviteUrl: string
  emailQueued: boolean
}

export interface InvitationPreviewWire {
  id: string
  companyName: string
  logoUrl: string | null
  email: string
  role: MembershipRole
  expired: boolean
}

export interface MyInvitationWire {
  id: string
  companyName: string
  logoUrl: string | null
  role: MembershipRole
  expiresAt: string
  expired: boolean
}

export function toInvitation({ invitedByName, ...rest }: InvitationWire): Invitation {
  return { ...rest, invitedByName: invitedByName ?? undefined }
}

export function toSentInvitation(wire: SentInvitationWire): SentInvitation {
  return { ...toInvitation(wire), inviteUrl: wire.inviteUrl, emailQueued: wire.emailQueued }
}

export function toInvitationPreview({ logoUrl, ...rest }: InvitationPreviewWire): InvitationPreview {
  return { ...rest, logoUrl: logoUrl ?? undefined }
}

export function toMyInvitation({ logoUrl, ...rest }: MyInvitationWire): MyInvitation {
  return { ...rest, logoUrl: logoUrl ?? undefined }
}
