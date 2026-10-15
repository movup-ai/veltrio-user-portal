import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'
import { ME_QUERY_KEY } from '@/services/auth/use-me'
import type { MembershipRole } from '@/types/user'
import { usersApi } from '../api/users.api'
import type { Member } from '../types/users.types'

export const memberKeys = {
  all: ['members'] as const,
}

/** Owners only: the API refuses the team to anyone else, so the page mounts this for owners alone. */
export function useMembers() {
  return useQuery({ queryKey: memberKeys.all, queryFn: usersApi.members })
}

function useMemberMutation<TArgs>(
  mutationFn: (args: TArgs) => Promise<unknown>,
  titles: { success: string; error: string },
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: memberKeys.all })
      // An owner who steps down or leaves has just changed their own role.
      void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY })
      toast({ title: titles.success, variant: 'success' })
    },
    onError: (error) => {
      toast({ title: titles.error, description: normalizeApiError(error).message, variant: 'error' })
    },
  })
}

export function useChangeRole() {
  return useMemberMutation<{ member: Member; role: MembershipRole }>(
    ({ member, role }) => usersApi.changeRole(member.userId, role),
    { success: i18n.t('settings:users.toast.roleChanged'), error: i18n.t('settings:users.toast.roleFailed') },
  )
}

export function useRemoveMember() {
  return useMemberMutation<Member>((member) => usersApi.remove(member.userId), {
    success: i18n.t('settings:users.toast.removed'),
    error: i18n.t('settings:users.toast.removeFailed'),
  })
}
