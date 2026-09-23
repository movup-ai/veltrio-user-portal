import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'
import type { PaginationParams } from '@/types/common'
import { bookingDraftApi } from '../api/booking-draft.api'

export const bookingDraftKeys = {
  all: ['booking-drafts'] as const,
  list: (params: PaginationParams) => [...bookingDraftKeys.all, 'list', params] as const,
}

/** The API caps drafts per tenant well below this, so one page always holds them all. */
export const DRAFTS_PAGE: PaginationParams = { page: 1, pageSize: 50 }

export function useBookingDrafts(params: PaginationParams = DRAFTS_PAGE) {
  return useQuery({
    queryKey: bookingDraftKeys.list(params),
    queryFn: () => bookingDraftApi.list(params),
    placeholderData: (previous) => previous,
  })
}

/**
 * Saves the wizard's state, creating a draft or updating the one being resumed. Toasts read
 * the i18n singleton because they fire outside the React tree.
 */
export function useSaveBookingDraft() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: Record<string, unknown> }) =>
      id ? bookingDraftApi.update(id, payload) : bookingDraftApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingDraftKeys.all })
    },
    onError: (error) => {
      toast({
        title: i18n.t('bookings:form.draft.saveFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}

/**
 * `silent` suppresses the toasts for callers that remove a draft as part of a larger action —
 * submitting one as a booking is not "discarding" it, and reports its own failure.
 */
export function useDeleteBookingDraft({ silent = false }: { silent?: boolean } = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => bookingDraftApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingDraftKeys.all })
      if (!silent) toast({ title: i18n.t('bookings:form.draft.discarded'), variant: 'success' })
    },
    onError: (error) => {
      if (silent) return
      toast({
        title: i18n.t('bookings:form.draft.discardFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}
