import { useMutation, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { bookingPaymentKeys } from '@/modules/payments/hooks/use-booking-payments'
import { normalizeApiError } from '@/services/api/errors'
import { bookingApi } from '../api/booking.api'
import { bookingKeys } from './use-bookings'

type Handover = 'pickUp' | 'returnVehicle'

const TOASTS = {
  pickUp: { success: 'bookings:toast.pickedUp', error: 'bookings:toast.pickUpFailed' },
  returnVehicle: { success: 'bookings:toast.returned', error: 'bookings:toast.returnFailed' },
} as const

/** The keys changing hands. The payment card is refreshed too: its buttons follow the status. */
export function useBookingHandover(reference: string, handover: Handover) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => bookingApi[handover](reference),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      void queryClient.invalidateQueries({ queryKey: bookingPaymentKeys.booking(reference) })
      toast({ title: i18n.t(TOASTS[handover].success), variant: 'success' })
    },
    onError: (error) =>
      toast({
        title: i18n.t(TOASTS[handover].error),
        description: normalizeApiError(error).message,
        variant: 'error',
      }),
  })
}
