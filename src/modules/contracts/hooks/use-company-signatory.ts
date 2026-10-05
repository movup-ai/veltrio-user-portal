import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'
import { companySignatoryApi } from '../api/company-signatory.api'
import type { CompanySignatory, CompanySignatoryInput } from '../types/company-signatory.types'

export const companySignatoryKeys = {
  detail: ['company-signatory'] as const,
}

export function useCompanySignatory() {
  return useQuery({ queryKey: companySignatoryKeys.detail, queryFn: companySignatoryApi.get })
}

/** No error toast: the card shows a refused drawing under the pad, and toasts only the rest. */
export function useSaveCompanySignatory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CompanySignatoryInput) => companySignatoryApi.save(input),
    onSuccess: (signatory) => {
      queryClient.setQueryData<CompanySignatory>(companySignatoryKeys.detail, signatory)
      toast({ title: i18n.t('contracts:signatory.toast.saved'), variant: 'success' })
    },
  })
}

export function useRemoveCompanySignatory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => companySignatoryApi.remove(),
    onSuccess: () => {
      queryClient.setQueryData<CompanySignatory>(companySignatoryKeys.detail, {})
      toast({ title: i18n.t('contracts:signatory.toast.removed'), variant: 'success' })
    },
    onError: (error) =>
      toast({
        title: i18n.t('contracts:signatory.toast.failed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      }),
  })
}
