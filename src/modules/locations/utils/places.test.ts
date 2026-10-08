import { describe, expect, it } from 'vitest'
import { resolvePlace, type PlaceSuggestion } from './places'

interface Component {
  longText: string
  shortText: string
  types: string[]
}

const component = (type: string, longText: string, shortText = longText): Component => ({
  longText,
  shortText,
  types: [type, 'political'],
})

/** A suggestion whose details lookup answers with the given place, in Google's own shape. */
function suggestionFor(place: {
  formattedAddress?: string
  addressComponents?: Component[]
  location?: { lat: () => number; lng: () => number }
}): PlaceSuggestion {
  const prediction = { toPlace: () => ({ ...place, fetchFields: () => Promise.resolve() }) }
  return { id: 'p1', primary: '', secondary: '', prediction: prediction as never }
}

const BIG_OAK = {
  formattedAddress: '600 Big Oak Rd, St. Augustine, FL 32095, USA',
  addressComponents: [
    component('street_number', '600'),
    component('route', 'Big Oak Road', 'Big Oak Rd'),
    component('locality', 'St. Augustine'),
    component('administrative_area_level_2', 'St. Johns County'),
    component('administrative_area_level_1', 'Florida', 'FL'),
    component('country', 'United States', 'US'),
    component('postal_code', '32095'),
  ],
  location: { lat: () => 29.9712, lng: () => -81.4265 },
}

describe('resolvePlace', () => {
  it('splits a picked place into every part a branch stores', async () => {
    expect(await resolvePlace(suggestionFor(BIG_OAK))).toEqual({
      address: '600 Big Oak Rd, St. Augustine, FL 32095, USA',
      street: '600 Big Oak Road',
      city: 'St. Augustine',
      state: 'FL',
      postalCode: '32095',
      country: 'US',
      latitude: 29.9712,
      longitude: -81.4265,
    })
  })

  it('leaves out a part the country does not have rather than guessing it', async () => {
    const place = await resolvePlace(
      suggestionFor({
        formattedAddress: '10 Downing St, London SW1A 2AA, UK',
        addressComponents: [
          component('street_number', '10'),
          component('route', 'Downing Street', 'Downing St'),
          component('postal_town', 'London'),
          component('country', 'United Kingdom', 'GB'),
          component('postal_code', 'SW1A 2AA'),
        ],
        location: { lat: () => 51.5034, lng: () => -0.1276 },
      }),
    )

    expect(place).toMatchObject({ city: 'London', country: 'GB', postalCode: 'SW1A 2AA' })
    expect(place?.state).toBeUndefined()
  })

  it('reports nothing when Google returns no formatted address', async () => {
    expect(await resolvePlace(suggestionFor({ addressComponents: [] }))).toBeNull()
  })
})
