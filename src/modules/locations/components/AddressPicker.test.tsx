import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AddressPin } from '../types/location.types'

const suggestPlaces = vi.fn()
const resolvePlace = vi.fn()
const newSessionToken = vi.fn()

vi.mock('../utils/places', () => ({
  get placesConfigured() {
    return configured
  },
  suggestPlaces: (...args: unknown[]) => suggestPlaces(...args),
  resolvePlace: (...args: unknown[]) => resolvePlace(...args),
  newSessionToken: () => newSessionToken(),
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
  newSessionToken.mockReset().mockResolvedValue(undefined)
})

/** The spinner is decorative, so it has no role to query by. */
const spinner = () => document.querySelector('.animate-spin')

/** Longer than the picker's debounce, so "nothing was searched" is a real observation. */
const pastDebounce = () => new Promise((resolve) => setTimeout(resolve, 400))

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
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(RESOLVED.address, RESOLVED_PIN, true))

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

  it('stops the spinner when the field is cleared while an older search is still out', async () => {
    let answer: (results: unknown[]) => void = () => {}
    suggestPlaces.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)))
    const user = userEvent.setup({ delay: null })
    render(<Picker onChange={vi.fn()} />)
    const input = screen.getByRole('combobox')

    await user.type(input, '14')
    await waitFor(() => expect(suggestPlaces).toHaveBeenCalledTimes(1))
    expect(spinner()).toBeInTheDocument()
    // A second search is queued, then abandoned before it is sent. The first one is now
    // neither the newest nor wanted, which is what used to leave the spinner turning.
    await user.type(input, '4')
    await user.clear(input)
    answer([MIAMI])
    await pastDebounce()

    expect(spinner()).not.toBeInTheDocument()
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('does not search for an address that is only focused, not typed', async () => {
    const user = userEvent.setup({ delay: null })
    render(<AddressPicker value="1440 Collins Ave" onChange={vi.fn()} />)

    await user.click(screen.getByRole('combobox'))
    await pastDebounce()

    // Each unpicked search is billed, and a saved address needs no suggestions.
    expect(suggestPlaces).not.toHaveBeenCalled()
  })

  it('waits for a second character before searching', async () => {
    const user = userEvent.setup({ delay: null })
    render(<Picker onChange={vi.fn()} />)

    await user.type(screen.getByRole('combobox'), '1')
    await pastDebounce()

    expect(suggestPlaces).not.toHaveBeenCalled()
  })

  it('reuses the earlier results when a character is deleted again', async () => {
    const user = userEvent.setup({ delay: null })
    render(<Picker onChange={vi.fn()} />)
    const input = screen.getByRole('combobox')

    await user.type(input, 'Miami')
    await screen.findByRole('option', { name: /1440 Collins Ave/ })
    suggestPlaces.mockResolvedValueOnce([])
    await user.type(input, 'x')
    await waitFor(() => expect(screen.queryByRole('option')).not.toBeInTheDocument())

    await user.keyboard('{Backspace}')

    expect(await screen.findByRole('option', { name: /1440 Collins Ave/ })).toBeInTheDocument()
    expect(suggestPlaces).toHaveBeenCalledTimes(2)
  })

  it('starts loading Google on focus, so the first search does not wait for it', async () => {
    const user = userEvent.setup({ delay: null })
    render(<Picker onChange={vi.fn()} />)

    await user.click(screen.getByRole('combobox'))

    await waitFor(() => expect(newSessionToken).toHaveBeenCalled())
    expect(suggestPlaces).not.toHaveBeenCalled()
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
