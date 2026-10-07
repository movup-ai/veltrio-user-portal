import { CONDITION_PHOTO_TYPES, MAX_CONDITION_PHOTO_BYTES } from '../constants/booking.constants'
import type { BookingCondition, ConditionPhoto } from '../types/booking.types'

/**
 * The odometer as typed, or which rule it breaks. A comma, dot or space is taken only where it
 * groups thousands: dropped anywhere else, a tenth of a mile would read as ten times the miles.
 */
export function checkOdometer(
  text: string,
  pickupOdometer?: number,
): { odometer: number } | { error: 'invalid' | 'belowPickup' } {
  const typed = text.trim()
  if (!/^(\d{1,3}([.,\s]\d{3})+|\d+)$/.test(typed)) return { error: 'invalid' }
  const digits = typed.replace(/\D/g, '')
  if (digits.length > 7) return { error: 'invalid' }
  const odometer = Number(digits)
  if (pickupOdometer !== undefined && odometer < pickupOdometer) return { error: 'belowPickup' }
  return { odometer }
}

/**
 * The notes and photos to show for each handover that has been recorded and has either. A
 * photo of a handover still to come is not part of the booking's record, so it is left out.
 */
export function recordedStages(
  pickup: BookingCondition | undefined,
  back: BookingCondition | undefined,
  photos: ConditionPhoto[],
) {
  return (
    [
      { stage: 'pickup', condition: pickup },
      { stage: 'return', condition: back },
    ] as const
  )
    .filter((entry) => entry.condition)
    .map(({ stage, condition }) => ({
      stage,
      notes: condition?.notes,
      photos: photos.filter((photo) => photo.stage === stage),
    }))
    .filter((entry) => entry.notes || entry.photos.length > 0)
}

/**
 * Miles driven past the allowance and what they cost at the booking's own rate. Nothing when
 * either end went unread, the mileage is unlimited, no rate was set or it stayed within.
 */
export function overMileage(
  pickup: BookingCondition | undefined,
  back: BookingCondition | undefined,
  includedMiles: number | null,
  ratePerMile: number | undefined,
): { miles: number; amount: number } | undefined {
  if (!pickup || !back || includedMiles == null || !ratePerMile) return undefined
  const miles = back.odometer - pickup.odometer - includedMiles
  if (miles <= 0) return undefined
  return { miles, amount: Math.round(miles * ratePerMile * 100) / 100 }
}

/** The car is out on a live booking, so its return readings are still to be taken. */
export function awaitsReturnReadings(
  booking: { pickedUpAt?: string; returnedAt?: string },
  closed: boolean,
): boolean {
  return Boolean(booking.pickedUpAt) && !booking.returnedAt && !closed
}

type PickedFile = Pick<File, 'name' | 'type' | 'size'>

/** Splits picked files into those to upload and, for each of the rest, why it was left out. */
export function screenConditionPhotos<F extends PickedFile>(files: F[], remaining: number) {
  const accepted: F[] = []
  const rejected: { name: string; reason: 'type' | 'empty' | 'size' | 'limit' }[] = []

  for (const file of files) {
    if (!CONDITION_PHOTO_TYPES.includes(file.type)) rejected.push({ name: file.name, reason: 'type' })
    // The API refuses a file with no bytes, and one refused photo fails the whole handover.
    else if (file.size === 0) rejected.push({ name: file.name, reason: 'empty' })
    else if (file.size > MAX_CONDITION_PHOTO_BYTES) rejected.push({ name: file.name, reason: 'size' })
    else if (accepted.length >= remaining) rejected.push({ name: file.name, reason: 'limit' })
    else accepted.push(file)
  }
  return { accepted, rejected }
}
