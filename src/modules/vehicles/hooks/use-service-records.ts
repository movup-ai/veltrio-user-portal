import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'
import { serviceRecordApi } from '../api/service-record.api'
import type { ServiceRecordInput } from '../types/service-record.types'

export const serviceRecordKeys = {
  all: ['service-records'] as const,
  forVehicle: (vehicleId: string) => [...serviceRecordKeys.all, vehicleId] as const,
}

export function useServiceRecords(vehicleId: string | undefined) {
  return useQuery({
    queryKey: serviceRecordKeys.forVehicle(vehicleId ?? ''),
    queryFn: () => serviceRecordApi.list(vehicleId as string),
    enabled: Boolean(vehicleId),
  })
}

/**
 * Titles arrive already translated rather than as keys: i18next only checks a key against the
 * locale files where the literal is written inline, so passing keys through would lose that.
 */
function useServiceRecordMutation<TArgs>(
  vehicleId: string,
  mutationFn: (args: TArgs) => Promise<unknown>,
  titles: { success: string; error: string },
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceRecordKeys.forVehicle(vehicleId) })
      toast({ title: titles.success, variant: 'success' })
    },
    onError: (error) => {
      toast({
        title: titles.error,
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}

export function useCreateServiceRecord(vehicleId: string) {
  return useServiceRecordMutation<ServiceRecordInput>(
    vehicleId,
    (input) => serviceRecordApi.create(vehicleId, input),
    {
      success: i18n.t('vehicles:service.toast.created'),
      error: i18n.t('vehicles:service.toast.createFailed'),
    },
  )
}

export function useUpdateServiceRecord(vehicleId: string) {
  return useServiceRecordMutation<{ recordId: string; input: ServiceRecordInput }>(
    vehicleId,
    ({ recordId, input }) => serviceRecordApi.update(vehicleId, recordId, input),
    {
      success: i18n.t('vehicles:service.toast.updated'),
      error: i18n.t('vehicles:service.toast.updateFailed'),
    },
  )
}

export function useDeleteServiceRecord(vehicleId: string) {
  return useServiceRecordMutation<string>(
    vehicleId,
    (recordId) => serviceRecordApi.remove(vehicleId, recordId),
    {
      success: i18n.t('vehicles:service.toast.deleted'),
      error: i18n.t('vehicles:service.toast.deleteFailed'),
    },
  )
}
