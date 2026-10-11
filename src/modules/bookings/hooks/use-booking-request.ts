import { useMutation, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { bookingContractKeys } from '@/modules/contracts/hooks/use-booking-contract'
import { bookingPaymentKeys } from '@/modules/payments/hooks/use-booking-payments'
import { normalizeApiError } from '@/services/api/errors'
import { toCustomerConflict } from '@/modules/customers/api/customer.mapper'
import { customerKeys } from '@/modules/customers/hooks/use-customers'
import { bookingApi } from '../api/booking.api'
import type { Booking, CancelInput, DeclineInput, RenterAnswer } from '../types/booking.types'
import { bookingKeys } from './use-bookings'

const TOASTS = {
  confirm: { success: 'bookings:toast.confirmed', error: 'bookings:toast.confirmFailed' },
  decline: { success: 'bookings:toast.declined', error: 'bookings:toast.declineFailed' },
  restore: { success: 'bookings:toast.restored', error: 'bookings:toast.restoreFailed' },
  cancel: { success: 'bookings:toast.cancelled', error: 'bookings:toast.cancelFailed' },
} as const

/** The booking was already answered or restored elsewhere, so the page is showing stale buttons. */
const STALE = [
  'not_pending',
  'not_declined',
  'not_confirmed',
  'vehicle_out',
  'rental_over',
  'booking_cancelled',
]

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

/**
 * Says who a mismatched renter is. A refusal naming a customer on file is left to the caller:
 * it is another question for the counter, not a failure.
 */
export function useSettleRenter(reference: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ answer, allowSharedLicence }: { answer: RenterAnswer; allowSharedLicence?: boolean }) =>
      bookingApi.settleRenter(reference, answer, allowSharedLicence),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      void queryClient.invalidateQueries({ queryKey: customerKeys.all })
      toast({ title: i18n.t('bookings:toast.renterSettled'), variant: 'success' })
    },
    onError: (error) => {
      if (toCustomerConflict(error)) return
      const apiError = normalizeApiError(error)
      // Settled from another tab or by a colleague: reload so the banner goes away.
      if (apiError.code === 'renter_settled')
        void queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      toast({
        title: i18n.t('bookings:toast.renterSettleFailed'),
        description: apiError.message,
        variant: 'error',
      })
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

/**
 * Cancels a booking before pickup. The toast says what the counter still has to do itself:
 * hand back money paid in person, and tell the renter when no email could.
 */
export function useCancelBooking(reference: string, renterName: string, money: (amount: number) => string) {
  return useAnswer(
    reference,
    'cancel',
    (input: CancelInput) => bookingApi.cancel(reference, input),
    ({ emailQueued, refundByHand }) =>
      [
        refundByHand > 0 && i18n.t('bookings:toast.cancelledByHand', { amount: money(refundByHand) }),
        i18n.t(emailQueued ? 'bookings:toast.cancelledEmailQueued' : 'bookings:toast.renterNotNotified', {
          name: renterName,
        }),
      ]
        .filter(Boolean)
        .join(' '),
  )
}
