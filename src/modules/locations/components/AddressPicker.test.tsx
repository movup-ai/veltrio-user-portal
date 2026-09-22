import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AddressPin } from '../types/location.types'

const suggestPlaces = vi.fn()
const resolvePlace = vi.fn()

vi.mock('../utils/places', () => ({
  get placesConfigured() {
    return configured
  },
  suggestPlaces: (...args: unknown[]) => suggestPlaces(...args),
  resolvePlace: (...args: unknown[]) => resolvePlace(...args),
  newSessionToken: () => Promise.resolve(undefined),
  loadPlaces: () => Promise.resolve(),
}))

let configured = true

const { AddressPicker } = await import('./AddressPicker')

const MIAMI = {
  id: 'place-1',
  primary: '1440 Collins Ave',
  secondary: 'Miami Beach, FL, USA',
  prediction: {} as never,
}

const RESOLVED = {
  address: '1440 Collins Ave, Miami Beach, FL 33139, USA',
  street: '1440 Collins Ave',
  city: 'Miami Beach',
  state: 'FL',
  postalCode: '33139',
  country: 'US',
  latitude: 25.7907,
  longitude: -80.13,
}

function Picker({ onChange }: { onChange: (address: string, pin: AddressPin) => void }) {
  return <AddressPicker value="" onChange={onChange} />
}

beforeEach(() => {
  configured = true
  suggestPlaces.mockReset().mockResolvedValue([MIAMI])
  resolvePlace.mockReset().mockResolvedValue(RESOLVED)
})

describe('AddressPicker', () => {
  it('reports the address and its parts when a suggestion is chosen', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Picker onChange={onChange} />)

    await user.type(screen.getByRole('combobox'), '1440 Collins')
    await user.click(await screen.findByRole('option', { name: /1440 Collins Ave/ }))

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        RESOLVED.address,
        {
          street: '1440 Collins Ave',
          city: 'Miami Beach',
          state: 'FL',
          postalCode: '33139',
          country: 'US',
          latitude: 25.7907,
          longitude: -80.13,
        },
        // Picked, not typed — callers act on a resolved place differently.
        true,
      ),
    )
  })

  it('clears the parts when the address is then typed by hand', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Picker onChange={onChange} />)

    await user.type(screen.getByRole('combobox'), '1440 Collins')
    await user.click(await screen.findByRole('option', { name: /1440 Collins Ave/ }))
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(RESOLVED.address, RESOLVED_PIN, true),
    )

    onChange.mockClear()
    await user.type(screen.getByRole('combobox'), ' suite 3')

    // The coordinates described the picked place, not whatever was typed over it.
    expect(onChange).toHaveBeenCalled()
    expect(onChange.mock.calls.at(-1)?.[1]).toEqual({})
  })

  it('searches once for a burst of typing rather than per keystroke', async () => {
    const user = userEvent.setup()
    render(<Picker onChange={vi.fn()} />)

    await user.type(screen.getByRole('combobox'), 'Miami')

    await waitFor(() => expect(suggestPlaces).toHaveBeenCalled())
    expect(suggestPlaces).toHaveBeenCalledTimes(1)
    expect(suggestPlaces.mock.calls[0][0]).toBe('Miami')
  })

  it('is a plain text field when no Maps key is configured', async () => {
    configured = false
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Picker onChange={onChange} />)

    const input = screen.getByRole('textbox')
    expect(input).not.toHaveAttribute('role', 'combobox')

    await user.type(input, 'Behind the blue gate')

    expect(suggestPlaces).not.toHaveBeenCalled()
    // Typed, not picked, so nothing downstream should treat it as a resolved place.
    expect(onChange).toHaveBeenLastCalledWith('Behind the blue gate', {}, false)
  })

  it('keeps the chosen address in both places when the details lookup fails', async () => {
    resolvePlace.mockResolvedValue(null)
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Picker onChange={onChange} />)

    await user.type(screen.getByRole('combobox'), '1440 Collins')
    await user.click(await screen.findByRole('option', { name: /1440 Collins Ave/ }))

    const chosen = '1440 Collins Ave Miami Beach, FL, USA'
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue(chosen))
    // The form must hold what the input shows. Reporting the half-typed search term here
    // would save an address the user never saw.
    expect(onChange.mock.calls.at(-1)?.[0]).toBe(chosen)
  })

  it('reports the chosen text before the details arrive', async () => {
    // resolvePlace never settles, so only the immediate report can satisfy this.
    resolvePlace.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Picker onChange={onChange} />)

    await user.type(screen.getByRole('combobox'), '1440 Collins')
    await user.click(await screen.findByRole('option', { name: /1440 Collins Ave/ }))

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith('1440 Collins Ave Miami Beach, FL, USA', {}, false),
    )
  })
})

const RESOLVED_PIN = {
  street: RESOLVED.street,
  city: RESOLVED.city,
  state: RESOLVED.state,
  postalCode: RESOLVED.postalCode,
  country: RESOLVED.country,
  latitude: RESOLVED.latitude,
  longitude: RESOLVED.longitude,
}
