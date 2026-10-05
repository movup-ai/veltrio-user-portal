import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { usePdfOpener } from '@/lib/use-pdf-opener'
import { normalizeApiError } from '@/services/api/errors'
import { agreementTemplateApi } from '../api/agreement-template.api'
import type { AgreementTemplate, AgreementTemplateValues } from '../types/agreement-template.types'

export const agreementTemplateKeys = {
  all: ['agreement-templates'] as const,
  list: ['agreement-templates', 'list'] as const,
  detail: (id: string) => ['agreement-templates', 'detail', id] as const,
}

export function useAgreementTemplates() {
  return useQuery({ queryKey: agreementTemplateKeys.list, queryFn: agreementTemplateApi.list })
}

export function useAgreementTemplate(id: string) {
  return useQuery({ queryKey: agreementTemplateKeys.detail(id), queryFn: () => agreementTemplateApi.get(id) })
}

/**
 * Creates a template, or saves one that has an id. No error toast: the editor places a taken
 * name under its field, and only toasts what it cannot place.
 */
export function useSaveAgreementTemplate(id?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: AgreementTemplateValues) =>
      id ? agreementTemplateApi.update(id, values) : agreementTemplateApi.create(values),
    onSuccess: (template) => {
      queryClient.setQueryData<AgreementTemplate>(agreementTemplateKeys.detail(template.id), template)
      void queryClient.invalidateQueries({ queryKey: agreementTemplateKeys.list })
      toast({
        title: i18n.t(id ? 'contracts:agreements.toast.saved' : 'contracts:agreements.toast.created'),
        variant: 'success',
      })
    },
  })
}

function useListMutation(
  mutationFn: (id: string) => Promise<unknown>,
  titles: { success: string; error: string },
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agreementTemplateKeys.all })
      toast({ title: titles.success, variant: 'success' })
    },
    onError: (error) =>
      toast({ title: titles.error, description: normalizeApiError(error).message, variant: 'error' }),
  })
}

export function useMakeDefaultAgreementTemplate() {
  return useListMutation(agreementTemplateApi.makeDefault, {
    success: i18n.t('contracts:agreements.toast.defaultChanged'),
    error: i18n.t('contracts:agreements.toast.defaultFailed'),
  })
}

export function useDeleteAgreementTemplate() {
  return useListMutation(agreementTemplateApi.remove, {
    success: i18n.t('contracts:agreements.toast.deleted'),
    error: i18n.t('contracts:agreements.toast.deleteFailed'),
  })
}

/** Opens the text in the editor as a renter's PDF, saved or not. */
export function useAgreementTemplatePreview() {
  return usePdfOpener((body: string) => agreementTemplateApi.preview(body), {
    fallbackName: 'agreement-preview.pdf',
    errorTitle: () => i18n.t('contracts:agreements.toast.previewFailed'),
  })
}
