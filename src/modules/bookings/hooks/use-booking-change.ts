import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { bookingContractKeys } from '@/modules/contracts/hooks/use-booking-contract'
import { bookingPaymentKeys } from '@/modules/payments/hooks/use-booking-payments'
import { normalizeApiError } from '@/services/api/errors'
import { bookingApi } from '../api/booking.api'
import type { ChangeRequest } from '../types/booking.types'
import { bookingKeys } from './use-bookings'

export const bookingChangeKeys = {
  // Not under the bookings key: a change that went through would ask for its own quote again.
  quote: (reference: string, request: ChangeRequest) => ['booking-change-quote', reference, request] as const,
}

/** The booking moved since the page was read, so the dialog is offering what no longer applies. */
const STALE = ['not_before_pickup', 'booking_cancelled', 'vehicle_unavailable', 'quote_changed']

/**
 * What other dates or another vehicle would cost. Never cached or retried: a refusal is the
 * answer, and a price can move. The last quote stays up while the next loads.
 */
export function useChangeQuote(reference: string, request: ChangeRequest | undefined) {
  return useQuery({
    queryKey: bookingChangeKeys.quote(reference, request ?? {}),
    queryFn: () => bookingApi.quoteChange(reference, request as ChangeRequest),
    enabled: Boolean(request),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    placeholderData: keepPreviousData,
  })
}

/**
 * Moves the dates or the vehicle. The toast says what the counter has to do again because of
 * it. No error toast: the dialog shows what was wrong beside the fields.
 */
export function useChangeBooking(reference: string, renterName: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ request, total }: { request: ChangeRequest; total: number }) =>
      bookingApi.change(reference, request, total),
    onSuccess: ({ emailQueued, agreementVoided, depositReleased }) => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      void queryClient.invalidateQueries({ queryKey: bookingPaymentKeys.booking(reference) })
      void queryClient.invalidateQueries({ queryKey: bookingContractKeys.booking(reference) })
      toast({
        title: i18n.t('bookings:toast.changed'),
        description: [
          agreementVoided && i18n.t('bookings:toast.changedAgreement'),
          depositReleased && i18n.t('bookings:toast.changedDeposit'),
          i18n.t(emailQueued ? 'bookings:toast.changedEmailQueued' : 'bookings:toast.renterNotNotified', {
            name: renterName,
          }),
        ]
          .filter(Boolean)
          .join(' '),
        variant: 'success',
      })
    },
    onError: (error) => {
      if (STALE.includes(normalizeApiError(error).code ?? ''))
        void queryClient.invalidateQueries({ queryKey: bookingKeys.all })
    },
  })
}

/**
 * A change being put together in a dialog: its price as it stands, and making it at that price.
 * `request` is undefined while there is nothing valid to ask for.
 */
export function useChangeDraft(reference: string, renterName: string, request: ChangeRequest | undefined) {
  const quote = useChangeQuote(reference, request)
  const change = useChangeBooking(reference, renterName)
  // Only a quote for the request as it is now can be confirmed, not the one kept up before it.
  const priced = request && !quote.isFetching && !quote.isPlaceholderData ? quote.data : undefined

  return {
    /** What to show: the last quote while the next loads, nothing once it was refused. */
    quote: request && !quote.error ? quote.data : undefined,
    loading: quote.isFetching,
    ready: Boolean(priced),
    saving: change.isPending,
    refused: change.error ?? (request ? quote.error : null),
    /** Forgets a refused attempt, once the counter edits what was asked for. */
    reset: change.reset,
    submit: (onDone: () => void) => {
      if (!request || !priced) return
      change.mutate(
        { request, total: priced.total },
        // A price that moved is read again, so the new figure is there to confirm.
        { onSuccess: onDone, onError: () => void quote.refetch() },
      )
    },
  }
}
