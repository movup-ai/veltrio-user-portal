import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'
import { toOrganizationMembership } from '@/services/auth/auth.api'
import { ME_QUERY_KEY } from '@/services/auth/use-me'
import { useOrganizationStore } from '@/state/organization.store'
import { usersApi } from '../api/users.api'
import type { Invitation, InviteInput } from '../types/users.types'

export const invitationKeys = {
  all: ['invitations'] as const,
  preview: (token: string) => ['invitations', 'preview', token] as const,
  mine: (userId: string | null | undefined) => ['invitations', 'mine', userId] as const,
}

export function useInvitations() {
  return useQuery({ queryKey: invitationKeys.all, queryFn: usersApi.invitations })
}

/** Errors are the caller's to show: the dialog that sent it keeps them beside the form. */
export function useInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: InviteInput) => usersApi.invite(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: invitationKeys.all }),
  })
}

export function useResendInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitation: Invitation) => usersApi.resend(invitation.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: invitationKeys.all }),
    onError: (error) => {
      toast({
        title: i18n.t('settings:users.toast.resendFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitation: Invitation) => usersApi.revoke(invitation.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invitationKeys.all })
      toast({ title: i18n.t('settings:users.toast.revoked'), variant: 'success' })
    },
    onError: (error) => {
      toast({
        title: i18n.t('settings:users.toast.revokeFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}

/** A link's invitation, or null once the API has said it has none. Needs no session. */
export function useInvitationPreview(token: string | undefined) {
  return useQuery({
    queryKey: invitationKeys.preview(token ?? ''),
    queryFn: () =>
      usersApi.preview(token ?? '').catch((error: unknown) => {
        if (normalizeApiError(error).status === 404) return null
        throw error
      }),
    enabled: Boolean(token),
    retry: false,
  })
}

/**
 * Joins the company, and stores the account it returns: what ProtectedRoute would copy in after
 * its first render, done here so the dashboard does not flash a spinner on the way in.
 */
export function useAcceptInvitation(userId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, fullName }: { id: string; fullName: string }) => usersApi.accept(id, fullName),
    onSuccess: (me) => {
      queryClient.setQueryData([...ME_QUERY_KEY, userId], me)
      if (me.membership)
        useOrganizationStore.getState().setMembership(toOrganizationMembership(me.membership))
      void queryClient.invalidateQueries({ queryKey: invitationKeys.all })
    },
  })
}

/** Keyed by the Clerk user: the list follows the session's verified email. */
export function useMyInvitations(userId: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: invitationKeys.mine(userId),
    queryFn: usersApi.mine,
    enabled: enabled && Boolean(userId),
    retry: false,
  })
}
