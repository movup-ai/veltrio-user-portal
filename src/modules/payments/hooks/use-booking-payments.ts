import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { bookingKeys } from '@/modules/bookings/hooks/use-bookings'
import { normalizeApiError } from '@/services/api/errors'
import { bookingPaymentApi } from '../api/booking-payment.api'
import { documentFileName, heldDeposit, settlement } from '../utils/booking-payment.utils'
import type { BookingPayments, PaymentLink, ReturnCharge } from '../types/booking-payment.types'
import { saveBlob } from '@/lib/download'

export const bookingPaymentKeys = {
  all: ['booking-payments'] as const,
  booking: (reference: string) => ['booking-payments', reference] as const,
}

export function useBookingPayments(reference: string | undefined) {
  return useQuery({
    queryKey: bookingPaymentKeys.booking(reference ?? ''),
    queryFn: () => bookingPaymentApi.get(reference as string),
    enabled: Boolean(reference),
  })
}

/**
 * What cancelling would refund. Read again on every mount and dropped once unused: the policy's
 * answer depends on the hour, and on payments that may have landed since the last read.
 */
export function useCancellationQuote(reference: string, enabled: boolean) {
  return useQuery({
    queryKey: [...bookingPaymentKeys.booking(reference), 'cancellation'],
    queryFn: () => bookingPaymentApi.cancellationQuote(reference),
    enabled,
    staleTime: 0,
    gcTime: 0,
  })
}

/** The renter's link: the one already out when nothing has changed, so a sent text keeps working. */
export function useCreatePaymentLink(reference: string) {
  return useLinkAction(
    reference,
    () => bookingPaymentApi.createLink(reference),
    'payments:booking.toast.linkFailed',
  )
}

export function useRequestDeposit(reference: string) {
  return useLinkAction(
    reference,
    () => bookingPaymentApi.requestDeposit(reference),
    'payments:booking.toast.requestFailed',
  )
}

function useLinkAction(
  reference: string,
  action: () => Promise<PaymentLink>,
  errorTitle: 'payments:booking.toast.linkFailed' | 'payments:booking.toast.requestFailed',
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: action,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: bookingPaymentKeys.booking(reference) }),
    onError: (error) =>
      toast({ title: i18n.t(errorTitle), description: normalizeApiError(error).message, variant: 'error' }),
  })
}

/**
 * A change to the booking's money that answers with the new summary. The booking itself is
 * refreshed too: its payment state is what lists, the badge and the dashboard counts read.
 */
function useMoneyAction<TArgs>(
  reference: string,
  action: (args: TArgs) => Promise<BookingPayments>,
  titles: { success: string; error: string },
  { rereadOnError = false } = {},
) {
  const queryClient = useQueryClient()
  const key = bookingPaymentKeys.booking(reference)
  return useMutation({
    mutationFn: action,
    onSuccess: (payments) => {
      queryClient.setQueryData(key, payments)
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      toast({ title: titles.success, variant: 'success' })
    },
    onError: (error) => {
      if (rereadOnError) void queryClient.invalidateQueries({ queryKey: key })
      toast({ title: titles.error, description: normalizeApiError(error).message, variant: 'error' })
    },
  })
}

export function useRecordManualPayment(reference: string) {
  return useMoneyAction(
    reference,
    ({ amount, method }: { amount: number; method: string }) =>
      bookingPaymentApi.recordManual(reference, amount, method),
    {
      success: i18n.t('payments:booking.toast.recorded'),
      error: i18n.t('payments:booking.toast.recordFailed'),
    },
  )
}

export function useReleaseDeposit(reference: string) {
  return useMoneyAction(reference, () => bookingPaymentApi.releaseDeposit(reference), {
    success: i18n.t('payments:booking.toast.released'),
    error: i18n.t('payments:booking.toast.releaseFailed'),
  })
}

/**
 * Saves what the return cost, then settles the deposit on hold against it: captured as far
 * as the charges go, or released when there are none. Without a hold only the charges are
 * saved, and they become the booking's balance.
 */
export function useSettleReturn(reference: string) {
  return useMoneyAction(
    reference,
    async (charges: ReturnCharge[]) => {
      const saved = await bookingPaymentApi.setReturnCharges(reference, charges)
      const held = heldDeposit(saved)
      if (held <= 0) return saved
      // The balance, not the charges: part of them may have been paid since an earlier attempt.
      const { capture } = settlement(saved.balance, held)
      return capture > 0
        ? bookingPaymentApi.captureDeposit(reference, capture)
        : bookingPaymentApi.releaseDeposit(reference)
    },
    {
      success: i18n.t('payments:booking.toast.settled'),
      error: i18n.t('payments:booking.toast.settleFailed'),
    },
    // The charges may have been saved before the deposit step failed, so the card is re-read.
    { rereadOnError: true },
  )
}

export function useRefundPayment(reference: string) {
  return useMoneyAction(
    reference,
    ({ paymentId, amount, requestId }: { paymentId: string; amount: number; requestId: string }) =>
      bookingPaymentApi.refund(reference, paymentId, amount, requestId),
    {
      success: i18n.t('payments:booking.toast.refunded'),
      error: i18n.t('payments:booking.toast.refundFailed'),
    },
  )
}

/** Downloads the invoice or receipt PDF under the number the API gives it. */
export function useBookingDocument(reference: string) {
  return useMutation({
    mutationFn: async (kind: 'invoice' | 'receipt') => {
      saveBlob(await bookingPaymentApi.document(reference, kind), documentFileName(kind, reference))
    },
    onError: (error) =>
      toast({
        title: i18n.t('payments:booking.toast.documentFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      }),
  })
}

export function useReceiptLink(reference: string) {
  return useMutation({
    mutationFn: () => bookingPaymentApi.receiptLink(reference),
    onError: (error) =>
      toast({
        title: i18n.t('payments:booking.toast.receiptFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      }),
  })
}
