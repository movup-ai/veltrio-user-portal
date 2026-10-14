import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/types/api'
import { OnboardingPage } from './OnboardingPage'

// The page starts from the browser's zone: pinned, so every machine starts from the same one, and
// one outside the country the tests pick. Not through TZ, which a worker thread does not apply.
vi.mock('@/utils/timezones', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/timezones')>()),
  browserTimezone: () => 'Asia/Shanghai',
}))

// Signed in with Clerk, but with no tenant yet — exactly the state this page exists for.
const clerkUser = vi.hoisted(() => ({ current: null as { fullName: string } | null }))
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true }),
  useUser: () => ({ user: clerkUser.current }),
}))
const meResult = vi.hoisted(() => ({ current: { data: undefined as unknown } }))
vi.mock('@/services/auth/use-me', () => ({
  ME_QUERY_KEY: ['auth', 'me'],
  useMe: () => meResult.current,
}))

let placesConfigured = false
const PICKED = {
  address: '8610 Parkhill Forest Dr, Houston, TX 77088, USA',
  street: '8610 Parkhill Forest Drive',
  city: 'Houston',
  state: 'TX',
  postalCode: '77088',
  country: 'US',
  latitude: 29.8925711,
  longitude: -95.4812192,
}
const SUGGESTION = {
  id: 'p1',
  primary: '8610 Parkhill Forest Drive',
  secondary: 'Houston, TX, USA',
  prediction: {},
}

// Mocked so the field behaves the same with or without a Maps key in the environment.
vi.mock('@/modules/locations/utils/places', () => ({
  get placesConfigured() {
    return placesConfigured
  },
  suggestPlaces: () => Promise.resolve([SUGGESTION]),
  resolvePlace: () => Promise.resolve(PICKED),
  newSessionToken: () => Promise.resolve(undefined),
}))

const TAKEN = new ApiError('unknown', 'Subdomain is already taken', { status: 409, code: 'subdomain_taken' })

const registerTenant = vi.fn()
vi.mock('@/services/auth/auth.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/auth/auth.api')>()),
  authApi: { registerTenant: (...args: unknown[]) => registerTenant(...args) },
}))

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Fills everything except the field under test, so submits reach the API. */
async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Your full name/), 'Diego Rivas')
  await user.type(screen.getByLabelText(/Company name/), 'Sunstate Car Co.')
  await user.type(screen.getByLabelText(/Company address/), 'Behind the blue gate')

  await user.click(screen.getByLabelText(/Operating country/))
  await user.click(await screen.findByRole('button', { name: 'United States' }))

  await user.click(screen.getByLabelText(/Number of vehicles/))
  await user.click(await screen.findByRole('option', { name: '11-50 vehicles' }))
  await pickTimezone(user, 'New York')
}

async function pickTimezone(user: ReturnType<typeof userEvent.setup>, place: string) {
  const field = screen.getByLabelText(/Time zone/)
  await user.clear(field)
  // No second click: clicking the combobox puts its current label back before the typing.
  await user.type(field, place, { skipClick: true })
  await user.click(await screen.findByRole('button', { name: new RegExp(place) }))
}

beforeEach(() => {
  meResult.current = { data: undefined }
  clerkUser.current = null
  placesConfigured = false
  registerTenant.mockReset()
  registerTenant.mockResolvedValue({})
})

describe('OnboardingPage', () => {
  it('has no portal address field: it is derived from the company name', async () => {
    const user = userEvent.setup({ delay: null })
    renderPage()

    expect(screen.queryByLabelText(/Portal address/)).not.toBeInTheDocument()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(registerTenant).toHaveBeenCalledTimes(1))
    expect(registerTenant.mock.calls[0][0].subdomain).toBe('sunstate-car-co')
  })

  it('moves on to the plans once the company exists, not to the dashboard', async () => {
    // The refreshed account arrives with a company before the move; the page must not read that
    // as "already onboarded" and skip the remaining steps.
    registerTenant.mockImplementation(async () => {
      meResult.current = { data: { user: {}, membership: {} } }
      return {}
    })
    const user = userEvent.setup({ delay: null })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/onboarding']}>
          <Routes>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/onboarding/plan" element={<p>Plans</p>} />
            <Route path="/dashboard" element={<p>Dashboard</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Plans')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })

  it('asks for the zone once a country with several is chosen, listing its zones first', async () => {
    // The browser's zone was kept: a Florida company went in on Shanghai time.
    const user = userEvent.setup({ delay: null })
    renderPage()
    expect(screen.getByLabelText(/Time zone/)).toHaveValue('China Standard Time — Shanghai (GMT+8)')

    await user.click(screen.getByLabelText(/Operating country/))
    await user.click(await screen.findByRole('button', { name: 'United States' }))

    const field = screen.getByLabelText(/Time zone/)
    expect(field).toHaveValue('')
    await user.click(field)
    const [first] = await screen.findAllByRole('button', { name: /\(GMT/ })
    expect(first).toHaveTextContent('Eastern Time — New York')
  })

  it('fills in the zone of a country that has only one', async () => {
    const user = userEvent.setup({ delay: null })
    renderPage()

    await user.click(screen.getByLabelText(/Operating country/))
    await user.click(await screen.findByRole('button', { name: 'Colombia' }))

    expect((screen.getByLabelText(/Time zone/) as HTMLInputElement).value).toContain('Bogota')
  })

  it('leaves a zone picked by hand alone when the country changes afterwards', async () => {
    const user = userEvent.setup({ delay: null })
    renderPage()
    await pickTimezone(user, 'Chicago')

    await user.click(screen.getByLabelText(/Operating country/))
    await user.click(await screen.findByRole('button', { name: 'Colombia' }))

    expect((screen.getByLabelText(/Time zone/) as HTMLInputElement).value).toContain('Chicago')
  })

  it('asks for the zone straight after the country', () => {
    renderPage()
    const labels = screen
      .getAllByText(/^(Operating country|Time zone|Number of vehicles)/)
      .map((l) => l.textContent)

    expect(labels.map((l) => l?.replace(' *', ''))).toEqual([
      'Operating country',
      'Time zone',
      'Number of vehicles',
    ])
  })

  it('fills in the name Google gave Clerk', () => {
    clerkUser.current = { fullName: 'Ana López' }
    renderPage()

    expect(screen.getByLabelText(/Your full name/)).toHaveValue('Ana López')
  })

  it('shows no help text under the company address', () => {
    renderPage()

    expect(screen.getByLabelText(/Company address/)).not.toHaveAttribute('aria-describedby')
  })

  it('submits the company profile with the country as an ISO code', async () => {
    const user = userEvent.setup({ delay: null })
    renderPage()

    await fillRequiredFields(user)
    await user.type(screen.getByLabelText(/Company website/), 'sunstate.com')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(registerTenant).toHaveBeenCalledTimes(1))
    expect(registerTenant).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantName: 'Sunstate Car Co.',
        subdomain: 'sunstate-car-co',
        ownerFullName: 'Diego Rivas',
        country: 'US',
        fleetSize: '11_50',
        website: 'sunstate.com',
      }),
    )
  })

  it('omits an empty website rather than sending a blank string', async () => {
    const user = userEvent.setup({ delay: null })
    renderPage()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(registerTenant).toHaveBeenCalledTimes(1))
    expect(registerTenant.mock.calls[0][0].website).toBeUndefined()
  })

  it('stops an address the contact address could not hold', async () => {
    const user = userEvent.setup({ delay: null })
    renderPage()

    await fillRequiredFields(user)
    // One past the API's limit for the company's contact address.
    await user.type(screen.getByLabelText(/Company address/), 'x'.repeat(141))
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Keep the address to 160 characters or fewer')).toBeInTheDocument()
    expect(registerTenant).not.toHaveBeenCalled()
  })

  it('sends a picked company address with the parts and coordinates behind it', async () => {
    placesConfigured = true
    const user = userEvent.setup({ delay: null })
    renderPage()

    await fillRequiredFields(user)
    const address = screen.getByLabelText(/Company address/)
    await user.clear(address)
    await user.type(address, '8610 Parkhill')
    await user.click(await screen.findByRole('option', { name: /8610 Parkhill Forest Drive/ }))
    await waitFor(() => expect(address).toHaveValue(PICKED.address))
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(registerTenant).toHaveBeenCalledTimes(1))
    // The whole pin, so the starter branch is as complete as one added from Locations.
    expect(registerTenant.mock.calls[0][0].companyAddress).toEqual(PICKED)
  })

  /** Picks the Houston suggestion, leaving every other field alone. */
  async function pickAddress(user: ReturnType<typeof userEvent.setup>) {
    const address = screen.getByLabelText(/Company address/)
    await user.type(address, '8610 Parkhill')
    await user.click(await screen.findByRole('option', { name: /8610 Parkhill Forest Drive/ }))
    await waitFor(() => expect(address).toHaveValue(PICKED.address))
  }

  it('fills the operating country from the picked address', async () => {
    placesConfigured = true
    const user = userEvent.setup({ delay: null })
    renderPage()

    await user.type(screen.getByLabelText(/Your full name/), 'Diego Rivas')
    await user.type(screen.getByLabelText(/Company name/), 'Sunstate Car Co.')
    await pickAddress(user)
    await user.click(screen.getByLabelText(/Number of vehicles/))
    await user.click(await screen.findByRole('option', { name: '11-50 vehicles' }))

    expect(screen.getByLabelText(/Operating country/)).toHaveValue('United States')
    // A US address leaves the zone to choose: the country has several.
    await pickTimezone(user, 'New York')

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(registerTenant).toHaveBeenCalledTimes(1))
    expect(registerTenant.mock.calls[0][0].country).toBe('US')
  })

  it('leaves a country chosen by hand alone when an address is picked afterwards', async () => {
    placesConfigured = true
    const user = userEvent.setup({ delay: null })
    renderPage()

    await user.click(screen.getByLabelText(/Operating country/))
    await user.click(await screen.findByRole('button', { name: 'Mexico' }))
    await pickAddress(user)

    // A company can be based in one country and operate in another.
    expect(screen.getByLabelText(/Operating country/)).toHaveValue('Mexico')
  })

  it('sends a typed company address on its own, with no parts', async () => {
    const user = userEvent.setup({ delay: null })
    renderPage()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(registerTenant).toHaveBeenCalledTimes(1))
    expect(registerTenant.mock.calls[0][0].companyAddress).toEqual({ address: 'Behind the blue gate' })
  })

  it('asks for a company address before submitting', async () => {
    const user = userEvent.setup({ delay: null })
    renderPage()

    await fillRequiredFields(user)
    await user.clear(screen.getByLabelText(/Company address/))
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Company address is required')).toBeInTheDocument()
    expect(registerTenant).not.toHaveBeenCalled()
  })

  it('blocks submission until a country and fleet size are chosen', async () => {
    const user = userEvent.setup({ delay: null })
    renderPage()

    await user.type(screen.getByLabelText(/Your full name/), 'Diego Rivas')
    await user.type(screen.getByLabelText(/Company name/), 'Sunstate Car Co.')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Select the country you operate in')).toBeInTheDocument()
    expect(screen.getByText('Select how many vehicles you operate')).toBeInTheDocument()
    expect(registerTenant).not.toHaveBeenCalled()
  })

  it('moves to a numbered portal address when the name’s own is taken', async () => {
    registerTenant.mockRejectedValueOnce(TAKEN).mockRejectedValueOnce(TAKEN)
    const user = userEvent.setup({ delay: null })
    renderPage()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(registerTenant).toHaveBeenCalledTimes(3))
    // Nobody can fix a clash in a field they are not shown, so the form resolves it itself.
    expect(registerTenant.mock.calls.map(([payload]) => payload.subdomain)).toEqual([
      'sunstate-car-co',
      'sunstate-car-co-2',
      'sunstate-car-co-3',
    ])
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('stops after a few taken addresses and says what to change', async () => {
    registerTenant.mockRejectedValue(TAKEN)
    const user = userEvent.setup({ delay: null })
    renderPage()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Try a slightly different company name')
    expect(registerTenant).toHaveBeenCalledTimes(5)
  })

  it('puts a rejected field’s message under that field, and anything else above the form', async () => {
    registerTenant.mockRejectedValue(
      new ApiError('validation', 'Request validation failed', {
        status: 422,
        fieldErrors: [
          { field: 'ownerFullName', message: 'Not a valid name' },
          { field: 'plan', message: 'Unknown plan' },
        ],
      }),
    )
    const user = userEvent.setup({ delay: null })
    renderPage()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    // `plan` is not a field on this form, so it is left out rather than shown under another.
    expect(await screen.findByText('Not a valid name')).toBeInTheDocument()
    expect(screen.queryByText('Unknown plan')).not.toBeInTheDocument()
  })
})
