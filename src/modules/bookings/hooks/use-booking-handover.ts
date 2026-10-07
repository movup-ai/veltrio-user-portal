import { useMutation, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { bookingPaymentKeys } from '@/modules/payments/hooks/use-booking-payments'
import { normalizeApiError } from '@/services/api/errors'
import { conditionPhotoApi, uploadConditionPhoto } from '../api/booking-condition-photo.api'
import { bookingApi } from '../api/booking.api'
import type { ConditionPhoto, HandoverInput } from '../types/booking.types'
import { bookingKeys } from './use-bookings'
import { conditionPhotoKeys } from './use-condition-photos'

type Handover = 'pickUp' | 'returnVehicle' | 'close'

/** What each step is recorded with: the car as it changes hands, and nothing to close. */
interface Inputs {
  pickUp: HandoverInput
  returnVehicle: HandoverInput
  close: void
}

const TOASTS = {
  pickUp: { success: 'bookings:toast.pickedUp', error: 'bookings:toast.pickUpFailed' },
  returnVehicle: { success: 'bookings:toast.returned', error: 'bookings:toast.returnFailed' },
  close: { success: 'bookings:toast.closed', error: 'bookings:toast.closeFailed' },
} as const

/**
 * Sends a handover's photos, then records it. The form stores nothing before this, so the
 * photos are taken back if the handover does not go through: a booking keeps them only as
 * part of a handover that happened.
 */
async function recordHandover(
  reference: string,
  handover: 'pickUp' | 'returnVehicle',
  { photos, ...condition }: HandoverInput,
) {
  const stage = handover === 'pickUp' ? 'pickup' : 'return'
  // Left by an attempt that could not take its own back; the record is what this form showed.
  const leftover = (await conditionPhotoApi.list(reference)).filter((photo) => photo.stage === stage)
  await Promise.all(leftover.map((photo) => conditionPhotoApi.remove(reference, photo.id)))

  const sent: ConditionPhoto[] = []
  try {
    const uploads = await Promise.allSettled(
      photos.map((file) => uploadConditionPhoto(reference, stage, file)),
    )
    // Every arrival is noted before the first failure is raised, or the later ones stay stored.
    for (const upload of uploads) if (upload.status === 'fulfilled') sent.push(upload.value)
    const failed = uploads.find((upload) => upload.status === 'rejected')
    if (failed) throw failed.reason
    return await bookingApi[handover](reference, condition)
  } catch (error) {
    await Promise.allSettled(sent.map((photo) => conditionPhotoApi.remove(reference, photo.id)))
    throw error
  }
}

/** A rental moving on a step. The payment card is refreshed too: its buttons follow the status. */
export function useBookingHandover<H extends Handover>(reference: string, handover: H) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Inputs[H]) =>
      handover === 'close'
        ? bookingApi.close(reference)
        : // Cast: TypeScript cannot tie `handover` to the input its own step takes.
          recordHandover(reference, handover, input as HandoverInput),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      void queryClient.invalidateQueries({ queryKey: bookingPaymentKeys.booking(reference) })
      void queryClient.invalidateQueries({ queryKey: conditionPhotoKeys.booking(reference) })
      toast({ title: i18n.t(TOASTS[handover].success), variant: 'success' })
    },
    onError: (error) => {
      // An answer lost on the way back leaves the step recorded: re-read, so the button says so.
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      void queryClient.invalidateQueries({ queryKey: bookingPaymentKeys.booking(reference) })
      toast({
        title: i18n.t(TOASTS[handover].error),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}
