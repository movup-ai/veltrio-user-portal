import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'
import type { PaginationParams } from '@/types/common'
import { vehicleDraftApi } from '../api/vehicle-draft.api'
import { isPending } from '../api/vehicle-photo.api'
import type { VehicleInput } from '../types/vehicle.types'
import { vehicleKeys } from './use-vehicles'
import type { VehicleDraftPayload } from '../types/vehicle-draft.types'

export const vehicleDraftKeys = {
  all: ['vehicle-drafts'] as const,
  list: (params: PaginationParams) => [...vehicleDraftKeys.all, 'list', params] as const,
}

/** The API caps drafts per tenant well below this, so one page always holds them all. */
export const DRAFTS_PAGE: PaginationParams = { page: 1, pageSize: 50 }

/** Matches the vehicle detail poll — a cover photo takes a second or two to render. */
const PHOTO_POLL_MS = 2_000

/** `enabled` is false for a role that may not add vehicles: the endpoint would 403. */
export function useVehicleDrafts(params: PaginationParams = DRAFTS_PAGE, enabled = true) {
  return useQuery({
    queryKey: vehicleDraftKeys.list(params),
    queryFn: () => vehicleDraftApi.list(params),
    enabled,
    placeholderData: (previous) => previous,
    // Poll only while a cover is still processing, or its cell stays blank until a refresh.
    refetchInterval: (query) =>
      query.state.data?.items.some((draft) => draft.photos.some((p) => isPending(p.status)))
        ? PHOTO_POLL_MS
        : false,
  })
}

/**
 * Creates or updates depending on whether the wizard was opened from an existing draft, so the
 * caller can just say "save what I have" without tracking which it is.
 */
export function useSaveVehicleDraft() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: VehicleDraftPayload }) =>
      id ? vehicleDraftApi.update(id, payload) : vehicleDraftApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleDraftKeys.all })
      toast({
        title: i18n.t('vehicles:toast.draftSaved'),
        description: i18n.t('vehicles:toast.draftSavedDescription'),
        variant: 'success',
      })
    },
    onError: (error) => {
      toast({
        title: i18n.t('vehicles:toast.draftSaveFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}

/**
 * Publishes a draft as a vehicle. The API does both halves in one transaction, so there is no
 * window where the vehicle exists but the draft is still listed — or vice versa.
 *
 * Errors are deliberately re-thrown rather than toasted here: the form attaches them to the
 * offending field, which is far more useful than a banner for a duplicate VIN.
 */
export function usePublishVehicleDraft() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: VehicleInput }) =>
      vehicleDraftApi.publish(id, input),
    onSuccess: (vehicle) => {
      queryClient.invalidateQueries({ queryKey: vehicleDraftKeys.all })
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
      toast({
        title: i18n.t('vehicles:toast.added'),
        description: i18n.t('vehicles:toast.addedDescription', {
          name: `${vehicle.make} ${vehicle.model}`.trim(),
        }),
        variant: 'success',
      })
    },
  })
}

export function useDeleteVehicleDraft() {
  const queryClient = useQueryClient()

  return useMutation({
    // The API deletes the draft's photos and their stored files along with it.
    mutationFn: (id: string) => vehicleDraftApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleDraftKeys.all })
      toast({ title: i18n.t('vehicles:toast.draftDiscarded'), variant: 'success' })
    },
    onError: (error) => {
      toast({
        title: i18n.t('vehicles:toast.draftDiscardFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}
