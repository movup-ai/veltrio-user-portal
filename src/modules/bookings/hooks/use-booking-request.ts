import { useMutation, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { bookingContractKeys } from '@/modules/contracts/hooks/use-booking-contract'
import { bookingPaymentKeys } from '@/modules/payments/hooks/use-booking-payments'
import { normalizeApiError } from '@/services/api/errors'
import { bookingApi } from '../api/booking.api'
import type { Booking, DeclineInput } from '../types/booking.types'
import { bookingKeys } from './use-bookings'

const TOASTS = {
  confirm: { success: 'bookings:toast.confirmed', error: 'bookings:toast.confirmFailed' },
  decline: { success: 'bookings:toast.declined', error: 'bookings:toast.declineFailed' },
  restore: { success: 'bookings:toast.restored', error: 'bookings:toast.restoreFailed' },
} as const

/** The booking was already answered or restored elsewhere, so the page is showing stale buttons. */
const STALE = ['not_pending', 'not_declined']

/** The company's answer to a renter's own reservation. Both cards follow the new status. */
function useAnswer<TInput, TResult>(
  reference: string,
  answer: keyof typeof TOASTS,
  mutationFn: (input: TInput) => Promise<TResult>,
  describe?: (result: TResult) => string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      void queryClient.invalidateQueries({ queryKey: bookingPaymentKeys.booking(reference) })
      void queryClient.invalidateQueries({ queryKey: bookingContractKeys.booking(reference) })
      toast({ title: i18n.t(TOASTS[answer].success), description: describe?.(result), variant: 'success' })
    },
    onError: (error) => {
      const apiError = normalizeApiError(error)
      // Answered from another tab or by a colleague: reload so the stale buttons go away.
      if (STALE.includes(apiError.code ?? ''))
        void queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      toast({ title: i18n.t(TOASTS[answer].error), description: apiError.message, variant: 'error' })
    },
  })
}

export function useConfirmBooking(reference: string) {
  return useAnswer<void, Booking>(reference, 'confirm', () => bookingApi.confirm(reference))
}

export function useDeclineBooking(reference: string, renterName: string) {
  return useAnswer(
    reference,
    'decline',
    (input: DeclineInput) => bookingApi.decline(reference, input),
    // Queued is all the API knows, so the toast says an email is on its way, never that it arrived.
    ({ emailQueued }) =>
      i18n.t(emailQueued ? 'bookings:toast.declinedEmailQueued' : 'bookings:toast.renterNotNotified', {
        name: renterName,
      }),
  )
}

/** Undoes a decline. The renter was told no, so the toast says whether an email says otherwise. */
export function useRestoreBooking(reference: string, renterName: string) {
  return useAnswer<void, { emailQueued: boolean }>(
    reference,
    'restore',
    () => bookingApi.restore(reference),
    ({ emailQueued }) =>
      i18n.t(emailQueued ? 'bookings:toast.restoredEmailQueued' : 'bookings:toast.renterNotNotified', {
        name: renterName,
      }),
  )
}
