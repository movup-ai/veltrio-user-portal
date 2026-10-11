import { describe, expect, it } from 'vitest'
import { descriptionAiError, descriptionRequest, missingToGenerate } from './description-ai.utils'

const CAMRY = {
  make: 'Toyota',
  model: 'Camry',
  year: 2024,
  vehicleType: 'Sedan',
  color: 'Silver',
  transmission: 'Automatic',
  fuelType: 'Hybrid',
  seats: 5,
  doors: 4,
  features: ['airConditioning'],
  description: 'Roomy and quiet.',
}

describe('descriptionRequest', () => {
  it('sends the facts the form holds, with the text to rework', () => {
    expect(descriptionRequest(CAMRY, 'improve')).toEqual({
      action: 'improve',
      make: 'Toyota',
      model: 'Camry',
      year: 2024,
      vehicleType: 'Sedan',
      color: 'Silver',
      transmission: 'Automatic',
      fuelType: 'Hybrid',
      seats: 5,
      doors: 4,
      features: ['airConditioning'],
      existingDescription: 'Roomy and quiet.',
    })
  })

  it('leaves out what is still blank, which the API would otherwise reject', () => {
    // A cleared number input holds NaN, and an untouched select holds ''.
    const blank = { ...CAMRY, year: Number.NaN, seats: 0, color: ' ', vehicleType: '', description: '' }

    const request = descriptionRequest(blank, 'generate')

    expect(request).toEqual({
      action: 'generate',
      make: 'Toyota',
      model: 'Camry',
      transmission: 'Automatic',
      fuelType: 'Hybrid',
      doors: 4,
      features: ['airConditioning'],
    })
  })

  it('works on a form that has nothing in it yet', () => {
    expect(descriptionRequest({}, 'generate')).toEqual({ action: 'generate', features: [] })
  })
})

describe('descriptionAiError', () => {
  it('says what to do about a refusal the user can act on', () => {
    expect(descriptionAiError('description_limit_reached')).toBe('form.ai.limitReached')
    expect(descriptionAiError('vehicle_unnamed')).toBe('form.ai.needsMakeAndModel')
  })

  it('falls back to the general message for anything else', () => {
    // A provider outage or a missing key is nothing the person at the form can fix.
    expect(descriptionAiError('description_writer_unavailable')).toBe('form.ai.failedDescription')
    expect(descriptionAiError(undefined)).toBe('form.ai.failedDescription')
  })
})

describe('missingToGenerate', () => {
  it('names the fields a new description cannot be written without', () => {
    expect(missingToGenerate({ make: '', model: ' ' }, 'generate')).toEqual(['make', 'model'])
    expect(missingToGenerate({ make: 'Toyota' }, 'generate')).toEqual(['model'])
    expect(missingToGenerate({ make: 'Toyota', model: 'Camry' }, 'generate')).toEqual([])
  })

  it('asks nothing of a rework, which is written from the existing text', () => {
    expect(missingToGenerate({ description: 'Roomy and quiet.' }, 'improve')).toEqual([])
  })
})
