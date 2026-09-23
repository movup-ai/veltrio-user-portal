import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'
import { customerKeys } from '@/modules/customers/hooks/use-customers'
import { bookingApi } from '../api/booking.api'
import type { BookingInput } from '../types/booking.types'

export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  detail: (reference: string) => [...bookingKeys.all, 'detail', reference] as const,
  schedule: (from: string, to: string) => [...bookingKeys.all, 'schedule', from, to] as const,
}

export function useBookings() {
  return useQuery({
    queryKey: bookingKeys.lists(),
    queryFn: () => bookingApi.list(),
    placeholderData: (previous) => previous,
  })
}

export function useBookingDetails(reference: string | undefined) {
  return useQuery({
    queryKey: bookingKeys.detail(reference ?? ''),
    queryFn: () => bookingApi.detail(reference as string),
    enabled: Boolean(reference),
  })
}

/**
 * Live bookings touching a window. Disabled until the window is real (a reversed or
 * half-entered range has nothing to check against), and the last result stays on screen while
 * a new date is fetched so the vehicle list doesn't flicker between "booked" and free.
 */
export function useBookingSchedule(from: string, to: string, enabled: boolean) {
  return useQuery({
    queryKey: bookingKeys.schedule(from, to),
    queryFn: () => bookingApi.schedule(from, to),
    enabled,
    placeholderData: keepPreviousData,
  })
}

export function useCreateBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: BookingInput) => bookingApi.create(input),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      // A new booking may have created or refreshed a customer.
      queryClient.invalidateQueries({ queryKey: customerKeys.all })
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
      const apiError = normalizeApiError(error)
      // Someone else took the car while this form was open: refresh the schedule so the
      // vehicle list shows it as booked rather than inviting a second attempt.
      if (apiError.code === 'vehicle_unavailable') queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      toast({ title: i18n.t('bookings:toast.createFailed'), description: apiError.message, variant: 'error' })
    },
  })
}
