import { useRef } from 'react'
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
 * Takes this page's own uploads back, by id, and keeps the ids it could not. Left where they
 * are they hold the stage's photo slots, so the next try clears them before sending its own.
 */
async function takeBack(reference: string, ids: string[], stuck: Set<string>) {
  const results = await Promise.allSettled(ids.map((id) => conditionPhotoApi.remove(reference, id)))
  results.forEach((result, index) =>
    result.status === 'fulfilled' ? stuck.delete(ids[index]) : stuck.add(ids[index]),
  )
}

/**
 * Sends a handover's photos, then records it naming them. The API keeps those and discards
 * any other left on the stage, so nothing here deletes a photo this page did not upload.
 * Its own are taken back if the handover does not go through.
 */
async function recordHandover(
  reference: string,
  handover: 'pickUp' | 'returnVehicle',
  { photos, ...condition }: HandoverInput,
  stuck: Set<string>,
) {
  const stage = handover === 'pickUp' ? 'pickup' : 'return'
  await takeBack(reference, [...stuck], stuck)
  const sent: ConditionPhoto[] = []
  try {
    const uploads = await Promise.allSettled(
      photos.map((file) => uploadConditionPhoto(reference, stage, file)),
    )
    // Every arrival is noted before the first failure is raised, or the later ones stay stored.
    for (const upload of uploads) if (upload.status === 'fulfilled') sent.push(upload.value)
    const failed = uploads.find((upload) => upload.status === 'rejected')
    if (failed) throw failed.reason
    return await bookingApi[handover](reference, { ...condition, photoIds: sent.map((photo) => photo.id) })
  } catch (error) {
    await takeBack(
      reference,
      sent.map((photo) => photo.id),
      stuck,
    )
    throw error
  }
}

/** A rental moving on a step. The payment card is refreshed too: its buttons follow the status. */
export function useBookingHandover<H extends Handover>(reference: string, handover: H) {
  const queryClient = useQueryClient()
  // Photos an earlier try uploaded and could not take back, for the next one to clear first.
  const stuck = useRef(new Set<string>())
  return useMutation({
    mutationFn: (input: Inputs[H]) =>
      handover === 'close'
        ? bookingApi.close(reference)
        : // Cast: TypeScript cannot tie `handover` to the input its own step takes.
          recordHandover(reference, handover, input as HandoverInput, stuck.current),
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
      void queryClient.invalidateQueries({ queryKey: conditionPhotoKeys.booking(reference) })
      toast({
        title: i18n.t(TOASTS[handover].error),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}
