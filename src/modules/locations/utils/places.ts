import type { AddressPin } from '../types/location.types'

/**
 * Google Places (New) address lookup for the location dialog.
 *
 * The key ships in the client bundle — that is how the Maps JS API works — so it must be
 * restricted by HTTP referrer and to the Places API in the Google console. When no key is
 * configured the picker degrades to a plain text field rather than breaking the form.
 */

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

export const placesConfigured = Boolean(API_KEY)

const SCRIPT_ID = 'google-maps-places'

let loader: Promise<void> | undefined

/** Loads the Maps JS API once per page, reusing the in-flight promise for later callers. */
export function loadPlaces(): Promise<void> {
  if (!API_KEY) return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set'))
  if (loader) return loader

  loader = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Places API failed to load')))
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.async = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&libraries=places&loading=async&v=weekly`
    script.addEventListener('load', () => resolve())
    script.addEventListener('error', () => {
      // Cleared so a later attempt can retry rather than reusing the rejection forever.
      loader = undefined
      script.remove()
      reject(new Error('Places API failed to load'))
    })
    document.head.appendChild(script)
  })

  return loader
}

export interface PlaceSuggestion {
  id: string
  /** The bold part of the row — usually the street line. */
  primary: string
  /** The rest, e.g. "Miami Beach, FL, USA". */
  secondary: string
  /**
   * Google's own prediction object, kept so the details lookup can go through `toPlace()`.
   * That is what carries the session token forward — rebuilding the place from its id would
   * start a fresh session and be billed as a separate request.
   */
  prediction: google.maps.places.PlacePrediction
}

/**
 * Maps Google's address components onto our own fields.
 *
 * Google returns a list of typed parts rather than a shaped object, and which types are
 * present varies by country — a UK address has no `administrative_area_level_1`, so `state`
 * is simply absent rather than guessed at.
 */
function pinFrom(place: google.maps.places.Place): AddressPin {
  const part = (type: string, short = false) => {
    const found = place.addressComponents?.find((component) => component.types.includes(type))
    return (short ? found?.shortText : found?.longText) ?? undefined
  }

  const streetNumber = part('street_number')
  const route = part('route')
  const street = [streetNumber, route].filter(Boolean).join(' ') || undefined

  return {
    street,
    city: part('locality') ?? part('postal_town') ?? part('sublocality'),
    state: part('administrative_area_level_1', true),
    postalCode: part('postal_code'),
    country: part('country', true)?.toUpperCase(),
    latitude: place.location?.lat(),
    longitude: place.location?.lng(),
  }
}

export interface ResolvedPlace extends AddressPin {
  /** Google's formatted one-line address, which is what we display and store. */
  address: string
}

/** Free-text lookup. Returns [] rather than throwing, so typing never breaks the form. */
export async function suggestPlaces(
  input: string,
  sessionToken?: google.maps.places.AutocompleteSessionToken,
): Promise<PlaceSuggestion[]> {
  if (!input.trim()) return []

  try {
    await loadPlaces()
    const { AutocompleteSuggestion } = (await google.maps.importLibrary(
      'places',
    )) as google.maps.PlacesLibrary

    const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input,
      sessionToken,
    })

    return suggestions.flatMap((suggestion) => {
      const prediction = suggestion.placePrediction
      if (!prediction) return []
      return [
        {
          id: prediction.placeId,
          primary: prediction.mainText?.text ?? prediction.text.text,
          secondary: prediction.secondaryText?.text ?? '',
          prediction,
        },
      ]
    })
  } catch {
    return []
  }
}

/**
 * Fetches the full address for a chosen suggestion.
 *
 * Goes through the prediction's own `toPlace()`, which carries the session token from the
 * autocomplete request: Google then bills the whole session as one lookup instead of charging
 * for every keystroke that led to it.
 */
export async function resolvePlace(
  suggestion: PlaceSuggestion,
): Promise<ResolvedPlace | null> {
  try {
    const place = suggestion.prediction.toPlace()
    await place.fetchFields({ fields: ['formattedAddress', 'addressComponents', 'location'] })

    if (!place.formattedAddress) return null
    return { address: place.formattedAddress, ...pinFrom(place) }
  } catch {
    return null
  }
}

export async function newSessionToken(): Promise<
  google.maps.places.AutocompleteSessionToken | undefined
> {
  try {
    await loadPlaces()
    const { AutocompleteSessionToken } = (await google.maps.importLibrary(
      'places',
    )) as google.maps.PlacesLibrary
    return new AutocompleteSessionToken()
  } catch {
    return undefined
  }
}
