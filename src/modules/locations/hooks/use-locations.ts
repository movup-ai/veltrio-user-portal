import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'
import { locationApi } from '../api/location.api'
import type { Location, LocationInput } from '../types/location.types'

export const locationKeys = {
  all: ['locations'] as const,
}

export function useLocations() {
  return useQuery({
    queryKey: locationKeys.all,
    queryFn: () => locationApi.list(),
  })
}

export interface LocationNames {
  names: string[]
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

/**
 * The branch names for the pickers on vehicle and booking forms. Sorted by the API, so every
 * dropdown shows the same order.
 *
 * Loading and failure are reported rather than folded into an empty list: a vehicle must name
 * a branch, so a caller that cannot tell the difference would present "no branches exist" for
 * a request that merely failed, leaving no way to retry.
 */
export function useLocationNames(): LocationNames {
  const { data, isLoading, isError, refetch } = useLocations()
  return {
    names: (data ?? []).map((location) => location.name),
    isLoading,
    isError,
    refetch: () => void refetch(),
  }
}

function useLocationMutation<TArgs>(
  mutationFn: (args: TArgs) => Promise<unknown>,
  titles: { success: string; error: string },
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all })
      // A rename rewrites the branch on every vehicle based there, so their cached copies
      // are stale too.
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
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

export function useCreateLocation() {
  return useLocationMutation<LocationInput>((input) => locationApi.create(input), {
    success: i18n.t('locations:toast.created'),
    error: i18n.t('locations:toast.createFailed'),
  })
}

export function useUpdateLocation() {
  return useLocationMutation<{ id: string; input: LocationInput }>(
    ({ id, input }) => locationApi.update(id, input),
    {
      success: i18n.t('locations:toast.updated'),
      error: i18n.t('locations:toast.updateFailed'),
    },
  )
}

export function useDeleteLocation() {
  return useLocationMutation<Location>((location) => locationApi.remove(location.id), {
    success: i18n.t('locations:toast.deleted'),
    error: i18n.t('locations:toast.deleteFailed'),
  })
}
