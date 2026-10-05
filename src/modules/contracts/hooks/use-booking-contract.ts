import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { saveBlob } from '@/lib/download'
import { usePdfOpener } from '@/lib/use-pdf-opener'
import { bookingKeys } from '@/modules/bookings/hooks/use-bookings'
import { bookingPaymentKeys } from '@/modules/payments/hooks/use-booking-payments'
import { linkIsGone } from '@/modules/payments/utils/booking-payment.utils'
import { normalizeApiError } from '@/services/api/errors'
import { bookingContractApi } from '../api/booking-contract.api'
import type { BookingContract, ContractLink, SignatureInput } from '../types/booking-contract.types'
import { contractFileName } from '../utils/booking-contract.utils'

export const bookingContractKeys = {
  booking: (reference: string) => ['booking-contract', reference] as const,
  public: (link: ContractLink) => ['public-contract', link.tenantId, link.contractId, link.token] as const,
}

export function useBookingContract(reference: string) {
  return useQuery({
    queryKey: bookingContractKeys.booking(reference),
    queryFn: () => bookingContractApi.get(reference),
    enabled: Boolean(reference),
  })
}

/**
 * A change to the agreement that answers with where it now stands. Check in reads pickup's rule
 * from the payments summary and lists read the booking's signed flag, so both are refreshed.
 */
function useContractAction<TArgs>(
  reference: string,
  action: (args: TArgs) => Promise<BookingContract>,
  titles: { success?: string; error?: string },
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: action,
    onSuccess: (contract) => {
      queryClient.setQueryData(bookingContractKeys.booking(reference), contract)
      void queryClient.invalidateQueries({ queryKey: bookingPaymentKeys.booking(reference) })
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      if (titles.success) toast({ title: titles.success, variant: 'success' })
    },
    onError: (error) => {
      if (titles.error) {
        toast({ title: titles.error, description: normalizeApiError(error).message, variant: 'error' })
      }
    },
  })
}

/** The renter's link, issuing the agreement first if there is none. No success toast: the dialog opens. */
export function useIssueContract(reference: string) {
  return useContractAction(reference, () => bookingContractApi.issue(reference), {
    error: i18n.t('contracts:toast.issueFailed'),
  })
}

/** No error toast: the signing form shows what was wrong beside the signature. */
export function useSignAtCounter(reference: string) {
  return useContractAction(reference, (input: SignatureInput) => bookingContractApi.sign(reference, input), {
    success: i18n.t('contracts:toast.signed'),
  })
}

export function useVoidContract(reference: string) {
  return useContractAction(reference, (reason: string) => bookingContractApi.void(reference, reason), {
    success: i18n.t('contracts:toast.voided'),
    error: i18n.t('contracts:toast.voidFailed'),
  })
}

export function useChangeContractTemplate(reference: string) {
  return useContractAction(
    reference,
    (templateId: string) => bookingContractApi.changeTemplate(reference, templateId),
    {
      success: i18n.t('contracts:toast.templateChanged'),
      error: i18n.t('contracts:toast.templateChangeFailed'),
    },
  )
}

/**
 * Opens the agreement in a new tab: the signed copy, the one issued, or a preview before that.
 * Looking issues nothing, so a booking that has not been sent its agreement still says so.
 */
export function useContractPdfOpener(reference: string) {
  return usePdfOpener(() => bookingContractApi.pdf(reference), {
    fallbackName: contractFileName(reference),
    errorTitle: () => i18n.t('contracts:toast.pdfFailed'),
  })
}

export function useDownloadContract(reference: string) {
  return useMutation({
    mutationFn: async () => saveBlob(await bookingContractApi.pdf(reference), contractFileName(reference)),
    onError: (error) =>
      toast({
        title: i18n.t('contracts:toast.pdfFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      }),
  })
}

/** The renter's page. A link that is not valid fails at once; anything else is worth one retry. */
export function usePublicContract(link: ContractLink | undefined) {
  return useQuery({
    queryKey: link ? bookingContractKeys.public(link) : ['public-contract', 'none'],
    queryFn: () => bookingContractApi.public(link as ContractLink),
    enabled: Boolean(link),
    retry: (failures, error) => !linkIsGone(error) && failures < 1,
  })
}

/** No error toast: the signing form shows what was wrong beside the signature. */
export function usePublicSign(link: ContractLink) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SignatureInput) => bookingContractApi.publicSign(link, input),
    onSuccess: (contract) => queryClient.setQueryData(bookingContractKeys.public(link), contract),
  })
}
