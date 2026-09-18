import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'
import { vehicleApi } from '../api/vehicle.api'
import type { Vehicle, VehicleInput, VehicleListParams } from '../types/vehicle.types'

export const vehicleKeys = {
  all: ['vehicles'] as const,
  lists: () => [...vehicleKeys.all, 'list'] as const,
  list: (params: VehicleListParams) => [...vehicleKeys.lists(), params] as const,
  details: () => [...vehicleKeys.all, 'detail'] as const,
  detail: (id: string) => [...vehicleKeys.details(), id] as const,
  stats: (params: VehicleListParams) => [...vehicleKeys.all, 'stats', params] as const,
}

/**
 * Toasts fire outside the React tree, so they read the i18n singleton directly rather than
 * a `t` from a hook — the message is resolved once, at the moment the toast is raised.
 */
function vehicleName(vehicle: Vehicle): string {
  return `${vehicle.make} ${vehicle.model}`
}

export function useVehicles(params: VehicleListParams) {
  return useQuery({
    queryKey: vehicleKeys.list(params),
    queryFn: () => vehicleApi.list(params),
    placeholderData: (previous) => previous,
  })
}

/**
 * Fleet totals for the given filters. Takes the same params as useVehicles so the two stay in
 * step; page/pageSize are ignored by the endpoint.
 */
export function useVehicleStats(params: VehicleListParams) {
  return useQuery({
    queryKey: vehicleKeys.stats(params),
    queryFn: () => vehicleApi.stats(params),
    placeholderData: (previous) => previous,
  })
}

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: vehicleKeys.detail(id ?? ''),
    queryFn: () => vehicleApi.get(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: VehicleInput) => vehicleApi.create(input),
    onSuccess: (vehicle) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
      toast({
        title: i18n.t('vehicles:toast.added'),
        description: i18n.t('vehicles:toast.addedDescription', { name: vehicleName(vehicle) }),
        variant: 'success',
      })
    },
    onError: (error) => {
      toast({ title: i18n.t('vehicles:toast.addFailed'), description: normalizeApiError(error).message, variant: 'error' })
    },
  })
}

export function useUpdateVehicle(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: VehicleInput) => vehicleApi.update(id, input),
    onSuccess: (vehicle) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
      queryClient.setQueryData(vehicleKeys.detail(id), vehicle)
      toast({
        title: i18n.t('vehicles:toast.updated'),
        description: i18n.t('vehicles:toast.updatedDescription', { name: vehicleName(vehicle) }),
        variant: 'success',
      })
    },
    onError: (error) => {
      toast({ title: i18n.t('vehicles:toast.updateFailed'), description: normalizeApiError(error).message, variant: 'error' })
    },
  })
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (vehicle: Vehicle) => vehicleApi.remove(vehicle.id).then(() => vehicle),
    onSuccess: (vehicle) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
      queryClient.removeQueries({ queryKey: vehicleKeys.detail(vehicle.id) })
      toast({
        title: i18n.t('vehicles:toast.archived'),
        description: i18n.t('vehicles:toast.archivedDescription', { name: vehicleName(vehicle) }),
        variant: 'success',
      })
    },
    onError: (error) => {
      toast({ title: i18n.t('vehicles:toast.archiveFailed'), description: normalizeApiError(error).message, variant: 'error' })
    },
  })
}
