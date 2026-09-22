import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Location } from '../types/location.types'

let configured = false
const FULL_ADDRESS = '1440 Collins Ave, Miami Beach, FL 33139, USA'

const SUGGESTION = { id: 'p1', primary: '1440 Collins Ave', secondary: 'Miami Beach, FL, USA', prediction: {} }

vi.mock('../utils/places', () => ({
  get placesConfigured() {
    return configured
  },
  suggestPlaces: () => Promise.resolve([SUGGESTION]),
  resolvePlace: () => Promise.resolve({ address: FULL_ADDRESS, city: 'Miami Beach', country: 'US' }),
  newSessionToken: () => Promise.resolve(undefined),
  loadPlaces: () => Promise.resolve(),
}))

const create = vi.fn()
const update = vi.fn()

vi.mock('../hooks/use-locations', () => ({
  useCreateLocation: () => ({ mutate: create, isPending: false }),
  useUpdateLocation: () => ({ mutate: update, isPending: false }),
}))

const { LocationDialog } = await import('./LocationDialog')

const BRANCH: Location = {
  id: 'loc-1',
  name: 'Miami Beach',
  address: '1440 Collins Ave',
  status: 'Open',
  openingDays: 'monSun',
  opensAt: 9 * 60,
  closesAt: 18 * 60,
  isDefault: false,
  vehicleCount: 0,
}

function open(location?: Location) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <LocationDialog location={location} open onOpenChange={vi.fn()} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  configured = false
  create.mockReset()
  update.mockReset()
})

describe('LocationDialog without a Maps key', () => {
  it('offers the address parts by hand, since nothing can fill them in', async () => {
    open()

    expect(screen.getByText('Add address details (optional)')).toBeInTheDocument()
    // Every part the API stores has a field, street included.
    expect(screen.getByLabelText(/Street address/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^City/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Country/)).toBeInTheDocument()
  })

  it('gives every part an example to follow', () => {
    // Typed by hand here, so each field has to show what shape is expected.
    open()

    for (const label of [/Street address/, /^City/, /State or region/, /Postal code/, /^Country/]) {
      expect(screen.getByLabelText(label)).toHaveAttribute('placeholder')
    }
  })

  it('starts collapsed and expands on click', async () => {
    const user = userEvent.setup()
    open()

    const toggle = screen.getByRole('button', { name: 'Add address details (optional)' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps the fields reachable while collapsed, so a validation error can be seen', async () => {
    const user = userEvent.setup()
    open()

    // Collapsed hides them visually; removing them from the DOM would strand an error on a
    // field nobody could scroll to.
    await user.type(screen.getByLabelText(/^City/), 'Miami Beach')

    expect(screen.getByLabelText(/^City/)).toHaveValue('Miami Beach')
  })

  it('hides them again once a key is configured', () => {
    configured = true
    open()

    expect(screen.queryByText('Add address details (optional)')).not.toBeInTheDocument()
  })

  it('saves the parts that were typed', async () => {
    const user = userEvent.setup()
    open()

    await user.type(screen.getByLabelText(/Branch name/), 'Depot')
    await user.type(screen.getByLabelText(/Street address/), '1440 Collins Ave')
    await user.type(screen.getByLabelText(/^City/), 'Miami Beach')
    await user.type(screen.getByLabelText(/^Country/), 'us')
    await user.click(screen.getByRole('button', { name: 'Add location' }))

    await waitFor(() => expect(create).toHaveBeenCalled())
    const input = create.mock.calls[0][0]
    expect(input.street).toBe('1440 Collins Ave')
    expect(input.city).toBe('Miami Beach')
    // Upper-cased to match the API's ISO 3166-1 alpha-2 contract.
    expect(input.country).toBe('US')
  })

  it('will not let a longer country name be entered', async () => {
    const user = userEvent.setup()
    open()

    await user.type(screen.getByLabelText(/^Country/), 'USA')

    // The field is capped at two characters, so 'USA' cannot be submitted in the first place.
    expect(screen.getByLabelText(/^Country/)).toHaveValue('US')
  })

  it('leaves the parts unset when none were typed', async () => {
    const user = userEvent.setup()
    open()

    await user.type(screen.getByLabelText(/Branch name/), 'Depot')
    await user.click(screen.getByRole('button', { name: 'Add location' }))

    await waitFor(() => expect(create).toHaveBeenCalled())
    const input = create.mock.calls[0][0]
    expect(input.street).toBeUndefined()
    expect(input.city).toBeUndefined()
    expect(input.country).toBeUndefined()
  })
})

describe('LocationDialog original address', () => {
  /** Recorded, never shown, so the payload is the only place it can be observed. */
  it('is not a field on the form', () => {
    configured = true
    open()

    expect(screen.queryByLabelText(/Original address/)).not.toBeInTheDocument()
  })

  it('records the full address behind a picked suggestion', async () => {
    configured = true
    const user = userEvent.setup()
    open()

    await user.type(screen.getByLabelText(/Branch name/), 'Miami Beach')
    await user.type(screen.getByLabelText(/^Pin location/), '1440 Collins')
    await user.click(await screen.findByRole('option', { name: /1440 Collins Ave/ }))
    await waitFor(() => expect(screen.getByLabelText(/^Pin location/)).toHaveValue(FULL_ADDRESS))
    await user.click(screen.getByRole('button', { name: 'Add location' }))

    await waitFor(() => expect(create).toHaveBeenCalled())
    expect(create.mock.calls[0][0].originalAddress).toBe(FULL_ADDRESS)
  })

  it('records a typed address too, not only a picked one', async () => {
    configured = true
    const user = userEvent.setup()
    open()

    // No suggestion chosen — the address is whatever was typed, and that is still what this
    // branch was created with.
    await user.type(screen.getByLabelText(/Branch name/), 'Miami Beach')
    await user.type(screen.getByLabelText(/^Pin location/), '123 Made Up Road')
    await user.click(screen.getByRole('button', { name: 'Add location' }))

    await waitFor(() => expect(create).toHaveBeenCalled())
    expect(create.mock.calls[0][0].originalAddress).toBe('123 Made Up Road')
  })

  it('records it with no Maps key at all', async () => {
    configured = false
    const user = userEvent.setup()
    open()

    await user.type(screen.getByLabelText(/Branch name/), 'Depot')
    await user.type(screen.getByLabelText(/^Pin location/), 'Behind the blue gate')
    await user.click(screen.getByRole('button', { name: 'Add location' }))

    await waitFor(() => expect(create).toHaveBeenCalled())
    expect(create.mock.calls[0][0].originalAddress).toBe('Behind the blue gate')
  })

  it('stays unset when no address was given', async () => {
    configured = true
    const user = userEvent.setup()
    open()

    await user.type(screen.getByLabelText(/Branch name/), 'Miami Beach')
    await user.click(screen.getByRole('button', { name: 'Add location' }))

    await waitFor(() => expect(create).toHaveBeenCalled())
    expect(create.mock.calls[0][0].originalAddress).toBeUndefined()
  })

  it('keeps what an existing branch already recorded', async () => {
    configured = true
    const user = userEvent.setup()
    open({ ...BRANCH, originalAddress: 'Depot 4, north yard' })

    // Re-picking changes the displayed address; the original is what it was first identified
    // by and must survive that.
    await user.type(screen.getByLabelText(/^Pin location/), '1440 Collins')
    await user.click(await screen.findByRole('option', { name: /1440 Collins Ave/ }))
    await waitFor(() => expect(screen.getByLabelText(/^Pin location/)).toHaveValue(FULL_ADDRESS))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(update).toHaveBeenCalled())
    expect(update.mock.calls[0][0].input.originalAddress).toBe('Depot 4, north yard')
  })
})

describe('LocationDialog default toggle', () => {
  it('sends isDefault when the toggle is turned on', async () => {
    const user = userEvent.setup()
    open()

    await user.type(screen.getByLabelText(/Branch name/), 'Depot')
    await user.click(screen.getByRole('switch', { name: 'Make default' }))
    await user.click(screen.getByRole('button', { name: 'Add location' }))

    await waitFor(() => expect(create).toHaveBeenCalled())
    expect(create.mock.calls[0][0].isDefault).toBe(true)
  })

  it('holds the toggle on for the branch that is already default', () => {
    open({ ...BRANCH, isDefault: true })

    const toggle = screen.getByRole('switch', { name: 'Make default' })
    expect(toggle).toBeChecked()
    // Turning it off here would leave the tenant with no preselected branch.
    expect(toggle).toBeDisabled()
    expect(screen.getByText('This is the default branch. Set another to move it.')).toBeInTheDocument()
  })

  it('lets a non-default branch be promoted', async () => {
    const user = userEvent.setup()
    open(BRANCH)

    const toggle = screen.getByRole('switch', { name: 'Make default' })
    expect(toggle).not.toBeChecked()
    expect(toggle).toBeEnabled()

    await user.click(toggle)
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(update).toHaveBeenCalled())
    expect(update.mock.calls[0][0].input.isDefault).toBe(true)
  })
})

describe('LocationDialog opening hours', () => {
  it('uses the shared time picker rather than a native time input', async () => {
    open()

    // The shared picker is a button that opens a list; a native input would expose no role.
    const opens = screen.getByRole('button', { name: 'Opens at' })
    expect(opens).toBeInTheDocument()
    expect(document.querySelector('input[type="time"]')).toBeNull()
  })

  it('submits the time chosen from the picker as minutes from midnight', async () => {
    const user = userEvent.setup()
    open()

    await user.type(screen.getByLabelText(/Branch name/), 'Depot')
    await user.click(screen.getByRole('button', { name: 'Opens at' }))
    await user.click(await screen.findByRole('option', { name: '8:00 AM' }))
    await user.click(screen.getByRole('button', { name: 'Add location' }))

    await waitFor(() => expect(create).toHaveBeenCalled())
    expect(create.mock.calls[0][0].opensAt).toBe(8 * 60)
  })
})
