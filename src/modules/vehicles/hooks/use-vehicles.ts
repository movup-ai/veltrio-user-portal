import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'
import { vehicleApi } from '../api/vehicle.api'
import { photoThumbnail } from '../utils/vehicle.utils'
import { isPending } from '../api/vehicle-photo.api'
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
/** The most `GET /vehicles` allows in one page; past this a car falls back to its icon. */
const THUMBNAIL_FLEET_PAGE_SIZE = 100

/**
 * Vehicle id → cover thumbnail for the fleet, so a list that carries only the id (the bookings
 * table) can still show the car. Keyed on id rather than plate because plates are not unique.
 */
export function useVehicleThumbnails() {
  const { data } = useVehicles({ page: 1, pageSize: THUMBNAIL_FLEET_PAGE_SIZE })

  return useMemo(() => {
    const byVehicleId = new Map<string, string>()
    for (const vehicle of data?.items ?? []) {
      const cover = vehicle.photos[0]
      if (cover) {
        const url = photoThumbnail(cover)
        if (url) byVehicleId.set(vehicle.id, url)
      }
    }
    return byVehicleId
  }, [data])
}

/** Every make in the fleet, alphabetical — feeds the make filters that page their own list. */
export function useVehicleMakes(): string[] {
  const { data } = useVehicles({ page: 1, pageSize: THUMBNAIL_FLEET_PAGE_SIZE })

  return useMemo(() => {
    const makes = new Set((data?.items ?? []).map((v) => v.make).filter(Boolean))
    return [...makes].sort((a, b) => a.localeCompare(b))
  }, [data])
}

export function useVehicleStats(params: VehicleListParams) {
  return useQuery({
    queryKey: vehicleKeys.stats(params),
    queryFn: () => vehicleApi.stats(params),
    placeholderData: (previous) => previous,
  })
}

/** How often to re-check a vehicle whose photos the worker is still rendering. */
const PHOTO_POLL_MS = 2_000

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: vehicleKeys.detail(id ?? ''),
    queryFn: () => vehicleApi.get(id as string),
    enabled: Boolean(id),
    // Poll only while the worker still has variants to render, then stop.
    refetchInterval: (query) =>
      query.state.data?.photos.some((photo) => isPending(photo.status)) ? PHOTO_POLL_MS : false,
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

export function useReorderVehicles() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (vehicleIds: string[]) => vehicleApi.reorder(vehicleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() })
      toast({ title: i18n.t('vehicles:toast.orderSaved'), variant: 'success' })
    },
    onError: (error) => {
      toast({
        title: i18n.t('vehicles:toast.orderSaveFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}

export function useArchiveVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (vehicle: Vehicle) => vehicleApi.archive(vehicle.id).then(() => vehicle),
    onSuccess: (vehicle) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
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

export function useRestoreVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (vehicle: Vehicle) => vehicleApi.restore(vehicle.id).then(() => vehicle),
    onSuccess: (vehicle) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
      toast({
        title: i18n.t('vehicles:toast.restored'),
        description: i18n.t('vehicles:toast.restoredDescription', { name: vehicleName(vehicle) }),
        variant: 'success',
      })
    },
    onError: (error) => {
      toast({ title: i18n.t('vehicles:toast.restoreFailed'), description: normalizeApiError(error).message, variant: 'error' })
    },
  })
}

/**
 * Maintenance is a status the API guards: a vehicle that is on rent or archived is refused
 * with a 409 whose message explains why, so it is surfaced as-is.
 */
export function useSendToService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (vehicle: Vehicle) => vehicleApi.sendToService(vehicle.id).then(() => vehicle),
    onSuccess: (vehicle) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
      toast({
        title: i18n.t('vehicles:toast.sentToService'),
        description: i18n.t('vehicles:toast.sentToServiceDescription', { name: vehicleName(vehicle) }),
        variant: 'success',
      })
    },
    onError: (error) => {
      toast({ title: i18n.t('vehicles:toast.sendToServiceFailed'), description: normalizeApiError(error).message, variant: 'error' })
    },
  })
}

export function useReturnFromService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (vehicle: Vehicle) => vehicleApi.returnFromService(vehicle.id).then(() => vehicle),
    onSuccess: (vehicle) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
      toast({
        title: i18n.t('vehicles:toast.returnedFromService'),
        description: i18n.t('vehicles:toast.returnedFromServiceDescription', { name: vehicleName(vehicle) }),
        variant: 'success',
      })
    },
    onError: (error) => {
      toast({ title: i18n.t('vehicles:toast.returnFromServiceFailed'), description: normalizeApiError(error).message, variant: 'error' })
    },
  })
}
