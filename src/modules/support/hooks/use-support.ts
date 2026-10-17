import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'
import { supportApi } from '../api/support.api'
import type { Ticket, TicketInput, TicketListParams } from '../types/support.types'

export const supportKeys = {
  all: ['support-tickets'] as const,
  page: (params: TicketListParams) => ['support-tickets', 'page', params] as const,
  detail: (id: string) => ['support-tickets', 'detail', id] as const,
}

export function useTicketPage(params: TicketListParams) {
  const query = useQuery({
    queryKey: supportKeys.page(params),
    queryFn: () => supportApi.page(params),
    placeholderData: keepPreviousData,
  })
  return { ...query, isStale: query.isPlaceholderData }
}

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: supportKeys.detail(id ?? ''),
    queryFn: () => supportApi.get(id ?? ''),
    enabled: Boolean(id),
  })
}

function useStoreTicket() {
  const queryClient = useQueryClient()
  return (ticket: Ticket) => {
    queryClient.setQueryData(supportKeys.detail(ticket.id), ticket)
    void queryClient.invalidateQueries({ queryKey: [...supportKeys.all, 'page'] })
  }
}

/** Errors are the caller's to show: the dialog keeps them beside the form. */
export function useCreateTicket() {
  const store = useStoreTicket()
  return useMutation({ mutationFn: (input: TicketInput) => supportApi.create(input), onSuccess: store })
}

/** Errors are the caller's to show, so the typed reply and its files stay in place to send again. */
export function useReplyToTicket(id: string) {
  const store = useStoreTicket()
  return useMutation({
    mutationFn: ({ body, attachmentIds }: { body: string; attachmentIds: string[] }) =>
      supportApi.reply(id, body, attachmentIds),
    onSuccess: store,
  })
}

export function useCloseTicket(id: string) {
  const store = useStoreTicket()
  return useMutation({
    mutationFn: () => supportApi.close(id),
    onSuccess: store,
    onError: (error) => {
      toast({
        title: i18n.t('support:ticket.closeFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}
