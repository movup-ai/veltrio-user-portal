import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { bookingKeys } from '@/modules/bookings/hooks/use-bookings'
import { normalizeApiError } from '@/services/api/errors'
import { bookingPaymentApi } from '../api/booking-payment.api'
import { documentFileName, linkIsGone } from '../utils/booking-payment.utils'
import type { BookingPayments, PaymentLink, ReceiptLink } from '../types/booking-payment.types'
import { saveBlob } from '@/lib/download'

/** How often the renter's page re-asks while their bank is still deciding. */
const PROCESSING_POLL_MS = 3_000

export const bookingPaymentKeys = {
  all: ['booking-payments'] as const,
  booking: (reference: string) => ['booking-payments', reference] as const,
  public: (tenantId: string, token: string) => ['public-payment', tenantId, token] as const,
  publicReceipt: (link: ReceiptLink) =>
    ['public-receipt', link.tenantId, link.bookingId, link.token] as const,
}

export function useBookingPayments(reference: string | undefined) {
  return useQuery({
    queryKey: bookingPaymentKeys.booking(reference ?? ''),
    queryFn: () => bookingPaymentApi.get(reference as string),
    enabled: Boolean(reference),
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
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: action,
    onSuccess: (payments) => {
      queryClient.setQueryData(bookingPaymentKeys.booking(reference), payments)
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      toast({ title: titles.success, variant: 'success' })
    },
    onError: (error) =>
      toast({ title: titles.error, description: normalizeApiError(error).message, variant: 'error' }),
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

export function useCaptureDeposit(reference: string) {
  return useMoneyAction(reference, (amount: number) => bookingPaymentApi.captureDeposit(reference, amount), {
    success: i18n.t('payments:booking.toast.captured'),
    error: i18n.t('payments:booking.toast.captureFailed'),
  })
}

export function useReleaseDeposit(reference: string) {
  return useMoneyAction(reference, () => bookingPaymentApi.releaseDeposit(reference), {
    success: i18n.t('payments:booking.toast.released'),
    error: i18n.t('payments:booking.toast.releaseFailed'),
  })
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

/** The renter's page. Polls only while the bank is deciding; every read also syncs from Stripe. */
export function usePublicPayment(tenantId: string, token: string) {
  return useQuery({
    queryKey: bookingPaymentKeys.public(tenantId, token),
    queryFn: () => bookingPaymentApi.publicPayment(tenantId, token),
    // Each read goes to Stripe, which can blip; only a link that is truly gone fails at once.
    retry: (failures, error) => !linkIsGone(error) && failures < 2,
    refetchInterval: (query) => {
      const data = query.state.data
      const processing = data?.charge?.status === 'processing' || data?.deposit?.status === 'processing'
      return processing ? PROCESSING_POLL_MS : false
    },
  })
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

/** The renter's receipt page. Retried like the payment page: only a dead link fails at once. */
export function usePublicReceipt(link: ReceiptLink) {
  return useQuery({
    queryKey: bookingPaymentKeys.publicReceipt(link),
    queryFn: () => bookingPaymentApi.publicReceipt(link),
    retry: (failures, error) => !linkIsGone(error) && failures < 2,
  })
}
