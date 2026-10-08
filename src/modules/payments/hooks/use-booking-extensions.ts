import { useEffect, useRef } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { usePdfOpener } from '@/lib/use-pdf-opener'
import { bookingKeys } from '@/modules/bookings/hooks/use-bookings'
import { bookingContractKeys } from '@/modules/contracts/hooks/use-booking-contract'
import { normalizeApiError } from '@/services/api/errors'
import { bookingExtensionApi } from '../api/booking-extension.api'
import type { BookingExtension, BookingExtensions } from '../types/booking-extension.types'
import { awaitsPayment, settledOutcome } from '../utils/booking-extension.utils'
import { bookingPaymentKeys } from './use-booking-payments'

/** Under the bookings key: whatever re-reads a booking (a handover, a refund) re-reads these. */
export const bookingExtensionKeys = {
  booking: (reference: string) => [...bookingKeys.all, 'extensions', reference] as const,
  quote: (reference: string, returnAt: string) =>
    [...bookingExtensionKeys.booking(reference), 'quote', returnAt] as const,
}

/** How often a request that can still be paid is checked: the renter pays on their own page. */
const PENDING_POLL_MS = 15_000

export function useBookingExtensions(reference: string | undefined) {
  return useQuery({
    queryKey: bookingExtensionKeys.booking(reference ?? ''),
    queryFn: () => bookingExtensionApi.get(reference as string),
    enabled: Boolean(reference),
    // Past its time too, while its link is out: paid late it can still take effect or be owed back.
    refetchInterval: (query) => (awaitsPayment(query.state.data) ? PENDING_POLL_MS : false),
  })
}

/**
 * Re-reads the booking when a request is settled from elsewhere: a payment moved the return time
 * and the total, or left money to refund. Call it once per page, with the requests not waiting.
 */
export function useExtensionSettled(reference: string, history: BookingExtension[] | undefined) {
  const queryClient = useQueryClient()
  const outcome = history && settledOutcome(history)
  const seen = useRef(outcome)
  useEffect(() => {
    if (seen.current !== undefined && outcome !== undefined && seen.current !== outcome) {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      void queryClient.invalidateQueries({ queryKey: bookingPaymentKeys.booking(reference) })
    }
    seen.current = outcome
  }, [outcome, queryClient, reference])
}

/**
 * What a later return would cost. Never cached or retried: a refusal is the answer, and a
 * price can move. The last quote stays up while the next loads, so the dialog does not blank.
 */
export function useExtensionQuote(reference: string, returnAt: string | undefined) {
  return useQuery({
    queryKey: bookingExtensionKeys.quote(reference, returnAt ?? ''),
    queryFn: () => bookingExtensionApi.quote(reference, returnAt as string),
    enabled: Boolean(returnAt),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    placeholderData: keepPreviousData,
  })
}

/**
 * A change to the booking's extensions that answers with them as they now stand. An extension
 * moves the return time, the total and the agreement, so everything read from those is too.
 */
function useExtensionAction<TArgs>(
  reference: string,
  action: (args: TArgs) => Promise<BookingExtensions>,
  titles: { success: (extensions: BookingExtensions) => string; error?: string },
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: action,
    onSuccess: (extensions) => {
      queryClient.setQueryData(bookingExtensionKeys.booking(reference), extensions)
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      void queryClient.invalidateQueries({ queryKey: bookingPaymentKeys.booking(reference) })
      void queryClient.invalidateQueries({ queryKey: bookingContractKeys.booking(reference) })
      toast({ title: titles.success(extensions), variant: 'success' })
    },
    onError: (error) => {
      // What it was refused for may be news: another counter cancelled it, or the renter paid.
      void queryClient.invalidateQueries({ queryKey: bookingExtensionKeys.booking(reference) })
      if (titles.error) {
        toast({ title: titles.error, description: normalizeApiError(error).message, variant: 'error' })
      }
    },
  })
}

/** No error toast: the dialog shows what was wrong beside the dates. */
export function useRequestExtension(reference: string) {
  return useExtensionAction(
    reference,
    ({ returnAt, amount }: { returnAt: string; amount: number }) =>
      bookingExtensionApi.request(reference, returnAt, amount),
    {
      success: (extensions) =>
        i18n.t(
          extensions.pending ? 'payments:extension.toast.requested' : 'payments:extension.toast.extended',
        ),
    },
  )
}

export function useCancelExtension(reference: string) {
  return useExtensionAction(reference, () => bookingExtensionApi.cancel(reference), {
    // Paid a moment before it was withdrawn, it stands instead, and the toast must not say otherwise.
    success: (extensions) =>
      i18n.t(
        extensions.history[0]?.status === 'applied'
          ? 'payments:extension.toast.extended'
          : 'payments:extension.toast.cancelled',
      ),
    error: i18n.t('payments:extension.toast.cancelFailed'),
  })
}

export function useRecordExtensionPaid(reference: string) {
  return useExtensionAction(
    reference,
    (method: string) => bookingExtensionApi.recordPaid(reference, method),
    {
      success: () => i18n.t('payments:extension.toast.extended'),
      error: i18n.t('payments:extension.toast.recordFailed'),
    },
  )
}

/** Opens an extension's addendum in a new tab, as the agreement itself opens. */
export function useAddendumOpener(reference: string) {
  return usePdfOpener((extensionId: string) => bookingExtensionApi.addendum(reference, extensionId), {
    fallbackName: `EXT-${reference}.pdf`,
    errorTitle: () => i18n.t('payments:extension.toast.addendumFailed'),
  })
}
