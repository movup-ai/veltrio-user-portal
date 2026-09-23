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
 * Live bookings touching a window. Disabled until the window is real — a reversed or
 * half-entered range has nothing to check against.
 *
 * The previous window's result is kept while a new one loads, so the vehicle list does not
 * flicker between "booked" and free on every keystroke in a date field. But those intervals
 * describe the *old* dates: testing them against the new ones would show a taken car as
 * free (and fail on submit with `vehicle_unavailable`) or hide one that is available. The
 * hook therefore reports whether what it is handing back actually matches the window asked
 * for, and the form holds off on availability until it does.
 */
export function useBookingSchedule(from: string, to: string, enabled: boolean) {
  const query = useQuery({
    queryKey: bookingKeys.schedule(from, to),
    queryFn: () => bookingApi.schedule(from, to),
    enabled,
    placeholderData: keepPreviousData,
  })

  return {
    ...query,
    /** True while the data on hand belongs to a window other than the one requested. */
    isStale: query.isPlaceholderData,
  }
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
      if (apiError.code === 'vehicle_unavailable')
        queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      toast({ title: i18n.t('bookings:toast.createFailed'), description: apiError.message, variant: 'error' })
    },
  })
}
