import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import type { CancellationPolicy } from '@/lib/cancellation-policy'
import { normalizeApiError } from '@/services/api/errors'
import { ME_QUERY_KEY } from '@/services/auth/use-me'
import { companyApi } from '../api/company.api'
import type { CompanyPatch } from '../types/company.types'

export const companyKeys = {
  detail: ['company'] as const,
}

/** Owner-only on the API; callers without `settings.manage` should not enable it. */
export function useCompany(enabled = true) {
  return useQuery({ queryKey: companyKeys.detail, queryFn: companyApi.get, enabled })
}

/** Failures are left to the caller, which can place a 422 under the field it names. */
export function useUpdateCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (patch: CompanyPatch) => companyApi.update(patch),
    onSuccess: (company, patch) => {
      queryClient.setQueryData(companyKeys.detail, company)
      // The header reads the name, and every price the currency, off `/auth/me`.
      if (patch.name !== undefined || patch.currency !== undefined) {
        void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY })
      }
      toast({ title: i18n.t('settings:company.toast.saved'), variant: 'success' })
    },
  })
}

/** The cancellation policy saves on its own: it is a schedule, not one of the company's fields. */
export function useUpdateCancellationPolicy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (policy: CancellationPolicy | undefined) => companyApi.setCancellationPolicy(policy),
    onSuccess: (company) => {
      queryClient.setQueryData(companyKeys.detail, company)
      toast({ title: i18n.t('settings:company.toast.saved'), variant: 'success' })
    },
    onError: (error) => {
      toast({
        title: i18n.t('settings:company.toast.saveFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}
