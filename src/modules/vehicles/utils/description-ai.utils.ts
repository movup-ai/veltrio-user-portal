export type DescriptionAiAction = 'generate' | 'improve' | 'shorten' | 'expand'

export interface DescriptionAiRequest {
  action: DescriptionAiAction
  make?: string
  model?: string
  year?: number
  vehicleType?: string
  color?: string
  transmission?: string
  fuelType?: string
  seats?: number
  doors?: number
  features: string[]
  existingDescription?: string
}

/** The form's own fields, loosely typed: a half-filled form holds '' where an enum will be. */
interface Facts {
  make?: string
  model?: string
  year?: number
  vehicleType?: string
  color?: string
  transmission?: string
  fuelType?: string
  seats?: number
  doors?: number
  features?: string[]
  description?: string
}

const text = (value: string | undefined) => value?.trim() || undefined
// A cleared number input holds NaN, which JSON would send as null.
const count = (value: number | undefined) => (value && Number.isFinite(value) ? value : undefined)

/**
 * What the description writer is sent: the form as it stands, minus what is still blank. The
 * API writes only from these facts, so a blank sent as '' or 0 would be rejected or written up.
 */
export function descriptionRequest(values: Facts, action: DescriptionAiAction): DescriptionAiRequest {
  const request: DescriptionAiRequest = {
    action,
    make: text(values.make),
    model: text(values.model),
    year: count(values.year),
    vehicleType: text(values.vehicleType),
    color: text(values.color),
    transmission: text(values.transmission),
    fuelType: text(values.fuelType),
    seats: count(values.seats),
    doors: count(values.doors),
    features: values.features ?? [],
    existingDescription: text(values.description),
  }
  // Dropped rather than left undefined, so the request reads the same as what is sent.
  return Object.fromEntries(
    Object.entries(request).filter(([, value]) => value !== undefined),
  ) as unknown as DescriptionAiRequest
}

/** What has to be filled in before this action can run. The API refuses the same, but only after a round trip. */
export function missingToGenerate(values: Facts, action: DescriptionAiAction): ('make' | 'model')[] {
  if (action !== 'generate') return []
  return (['make', 'model'] as const).filter((field) => !text(values[field]))
}

/** The API's refusals someone at the form can act on, by the message that tells them how. */
const ERROR_KEYS = {
  description_limit_reached: 'form.ai.limitReached',
  vehicle_unnamed: 'form.ai.needsMakeAndModel',
} as const

/** The translation key for a failed request; the general message for anything unrecognised. */
export function descriptionAiError(code: string | undefined) {
  return code && code in ERROR_KEYS
    ? ERROR_KEYS[code as keyof typeof ERROR_KEYS]
    : 'form.ai.failedDescription'
}
