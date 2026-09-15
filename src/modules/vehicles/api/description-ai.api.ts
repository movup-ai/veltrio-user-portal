import { apiClient } from '@/services/api/client'
import { mockDelay, useMocks } from '@/lib/mock'

export type DescriptionAiAction = 'generate' | 'improve' | 'shorten' | 'expand'

export interface DescriptionAiInput {
  make: string
  model: string
  year: number
  vehicleType: string
  color: string
  transmission: string
  fuelType: string
  seats: number
  doors: number
  existingDescription?: string
}

function mockGenerate({ make, model, year, vehicleType, color, transmission, fuelType, seats, doors, existingDescription }: DescriptionAiInput, action: DescriptionAiAction): string {
  const namedModel = [make, model].filter(Boolean).join(' ')
  const subject = namedModel ? `The ${year ? `${year} ` : ''}${namedModel}` : 'This vehicle'
  const base = `${subject} pairs a ${color || 'sharp'} finish with a ${transmission || 'smooth'} drivetrain, making it a reliable ${(vehicleType || 'vehicle').toLowerCase()} pick for renters. Seats ${seats || 5} across ${doors || 4} doors and runs on ${fuelType || 'petrol'}, ready for city trips or weekend getaways.`

  switch (action) {
    case 'improve':
      return existingDescription ? `${existingDescription.replace(/\s+$/, '')} A well-kept, dependable choice that renters consistently rate highly.` : base
    case 'shorten': {
      const source = existingDescription || base
      const firstSentence = source.split('. ')[0]
      return firstSentence.endsWith('.') ? firstSentence : `${firstSentence}.`
    }
    case 'expand':
      return `${existingDescription || base} Comes fully cleaned and inspected before every handoff, with roadside assistance included for the full rental period.`
    case 'generate':
    default:
      return base
  }
}

/**
 * Dev-only stand-in for the not-yet-built OpenAI-backed description writer
 * (gated by VITE_USE_MOCKS, see .env.example). Swap this out once the
 * backend endpoint exists — the shape here is a best guess at the contract.
 */
export const descriptionAiApi = {
  generate: (input: DescriptionAiInput, action: DescriptionAiAction) => {
    if (useMocks) return mockDelay(mockGenerate(input, action))
    return apiClient
      .post<{ description: string }>('/ai/vehicle-description', { ...input, action })
      .then((r) => r.data.description)
  },
}
