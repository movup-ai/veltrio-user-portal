import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
}

export function useVehicles(params: VehicleListParams) {
  return useQuery({
    queryKey: vehicleKeys.list(params),
    queryFn: () => vehicleApi.list(params),
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
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() })
      toast({ title: 'Vehicle added', description: `${vehicle.make} ${vehicle.model} was added to the fleet.`, variant: 'success' })
    },
    onError: (error) => {
      toast({ title: 'Could not add vehicle', description: normalizeApiError(error).message, variant: 'error' })
    },
  })
}

export function useUpdateVehicle(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: VehicleInput) => vehicleApi.update(id, input),
    onSuccess: (vehicle) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() })
      queryClient.setQueryData(vehicleKeys.detail(id), vehicle)
      toast({ title: 'Vehicle updated', description: `${vehicle.make} ${vehicle.model} was updated.`, variant: 'success' })
    },
    onError: (error) => {
      toast({ title: 'Could not update vehicle', description: normalizeApiError(error).message, variant: 'error' })
    },
  })
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (vehicle: Vehicle) => vehicleApi.remove(vehicle.id).then(() => vehicle),
    onSuccess: (vehicle) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() })
      queryClient.removeQueries({ queryKey: vehicleKeys.detail(vehicle.id) })
      toast({ title: 'Vehicle archived', description: `${vehicle.make} ${vehicle.model} was archived and removed from the active fleet.`, variant: 'success' })
    },
    onError: (error) => {
      toast({ title: 'Could not archive vehicle', description: normalizeApiError(error).message, variant: 'error' })
    },
  })
}
