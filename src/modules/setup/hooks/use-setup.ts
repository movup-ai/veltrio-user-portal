import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'
import { useOrganizationStore } from '@/state/organization.store'
import { setupApi } from '../api/setup.api'
import type { SetupPatch } from '../types/setup.types'
import { hasSetup } from '../utils/setup.utils'

export const setupKeys = {
  setup: ['setup'] as const,
}

/**
 * Steps are finished on other pages and in Stripe, so this reads again on every mount and focus
 * rather than being told by each of them.
 */
export function useSetup() {
  const role = useOrganizationStore((state) => state.membership?.role)
  return useQuery({
    queryKey: setupKeys.setup,
    queryFn: setupApi.get,
    enabled: hasSetup(role),
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}

export function useUpdateSetup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (patch: SetupPatch) => setupApi.update(patch),
    onSuccess: (setup) => queryClient.setQueryData(setupKeys.setup, setup),
    onError: (error) =>
      toast({
        title: i18n.t('dashboard:setup.toast.saveFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      }),
  })
}
