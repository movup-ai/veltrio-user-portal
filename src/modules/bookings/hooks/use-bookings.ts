import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'
import { bookingApi } from '../api/booking.api'
import type { BookingInput } from '../types/booking.types'

export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
}

export function useBookings() {
  return useQuery({
    queryKey: bookingKeys.lists(),
    queryFn: () => bookingApi.list(),
    placeholderData: (previous) => previous,
  })
}

export function useCreateBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: BookingInput) => bookingApi.create(input),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
      // Toasts fire outside the React tree, so they read the i18n singleton rather than a hook's `t`.
      toast({
        title: i18n.t('bookings:toast.created'),
        description: i18n.t('bookings:toast.createdDescription', {
          reference: booking.reference,
          name: booking.customer.name,
        }),
        variant: 'success',
      })
    },
    onError: (error) => {
      toast({
        title: i18n.t('bookings:toast.createFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}
