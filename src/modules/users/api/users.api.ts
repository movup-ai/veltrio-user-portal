import { apiClient } from '@/services/api/client'
import type { MeResponse } from '@/services/auth/auth.api'
import type { MembershipRole } from '@/types/user'
import type {
  Invitation,
  InvitationPreview,
  InviteInput,
  Member,
  MyInvitation,
  SentInvitation,
} from '../types/users.types'
import {
  toInvitation,
  toInvitationPreview,
  toMyInvitation,
  toSentInvitation,
  type InvitationPreviewWire,
  type InvitationWire,
  type MemberWire,
  type MyInvitationWire,
  type SentInvitationWire,
} from './users.mapper'

/** The page an invitation link opens; the API appends the token as its last segment. */
export const INVITE_PATH = '/invite'

function acceptUrl(): string {
  return `${window.location.origin}${INVITE_PATH}`
}

export const usersApi = {
  members: (): Promise<Member[]> => apiClient.get<MemberWire[]>('/members').then((r) => r.data),

  changeRole: (userId: string, role: MembershipRole): Promise<Member> =>
    apiClient.patch<MemberWire>(`/members/${userId}`, { role }).then((r) => r.data),

  remove: (userId: string): Promise<void> => apiClient.delete(`/members/${userId}`).then(() => undefined),

  invitations: (): Promise<Invitation[]> =>
    apiClient.get<InvitationWire[]>('/invitations').then((r) => r.data.map(toInvitation)),

  invite: (input: InviteInput): Promise<SentInvitation> =>
    apiClient
      .post<SentInvitationWire>('/invitations', { ...input, acceptUrl: acceptUrl() })
      .then((r) => toSentInvitation(r.data)),

  resend: (id: string): Promise<SentInvitation> =>
    apiClient
      .post<SentInvitationWire>(`/invitations/${id}/resend`, { acceptUrl: acceptUrl() })
      .then((r) => toSentInvitation(r.data)),

  revoke: (id: string): Promise<void> => apiClient.delete(`/invitations/${id}`).then(() => undefined),

  preview: (token: string): Promise<InvitationPreview> =>
    apiClient
      .get<InvitationPreviewWire>('/invitations/preview', { params: { token } })
      .then((r) => toInvitationPreview(r.data)),

  mine: (): Promise<MyInvitation[]> =>
    apiClient.get<MyInvitationWire[]>('/invitations/mine').then((r) => r.data.map(toMyInvitation)),

  accept: (id: string, fullName: string): Promise<MeResponse> =>
    apiClient.post<MeResponse>(`/invitations/${id}/accept`, { fullName }).then((r) => r.data),
}
