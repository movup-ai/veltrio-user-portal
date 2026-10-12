import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { saveBlob } from '@/lib/download'
import { normalizeApiError } from '@/services/api/errors'
import { paymentApi } from '../api/payment.api'
import type { PaymentListParams, PaymentRow } from '../types/payment.types'
import { paymentReceiptFileName } from '../utils/payment.utils'

export const paymentKeys = {
  page: (params: PaymentListParams) => ['payments', 'page', params] as const,
  stats: ['payments', 'stats'] as const,
  methodsInUse: ['payments', 'methods-in-use'] as const,
}

// Read again on every visit: a renter paying their link changes this list from outside the
// portal, where no mutation here could invalidate it.
const ALWAYS_FRESH = { staleTime: 0 }

/** One page of the company's payments. The rows on screen stay while the next page loads. */
export function usePaymentPage(params: PaymentListParams) {
  const query = useQuery({
    queryKey: paymentKeys.page(params),
    queryFn: () => paymentApi.page(params),
    placeholderData: keepPreviousData,
    ...ALWAYS_FRESH,
  })
  return { ...query, isStale: query.isPlaceholderData }
}

export function usePaymentStats() {
  return useQuery({ queryKey: paymentKeys.stats, queryFn: paymentApi.stats, ...ALWAYS_FRESH })
}

/**
 * The method filter's choices: what this company's payments were actually paid with. Kept for
 * five minutes: it changes only when a kind of method is used for the first time.
 */
export function usePaymentMethodsInUse() {
  return useQuery({
    queryKey: paymentKeys.methodsInUse,
    queryFn: paymentApi.methodsInUse,
    staleTime: 5 * 60_000,
  })
}

/** Downloads the receipt of one payment: what that row itself took, not the whole rental. */
export function usePaymentReceipt() {
  return useMutation({
    mutationFn: async (payment: PaymentRow) => {
      saveBlob(await paymentApi.receipt(payment.id), paymentReceiptFileName(payment))
    },
    onError: (error) =>
      toast({
        title: i18n.t('payments:booking.toast.documentFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      }),
  })
}
