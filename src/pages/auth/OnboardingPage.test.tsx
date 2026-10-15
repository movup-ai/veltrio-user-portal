import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { lazy, Suspense } from 'react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOrganizationStore } from '@/state/organization.store'
import { useSitePreviewStore } from '@/state/site-preview.store'
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
  useAuth: () => ({ isLoaded: true, isSignedIn: true, userId: 'user_1' }),
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

const billingGet = vi.fn()
vi.mock('@/modules/billing/api/billing.api', () => ({ billingApi: { get: () => billingGet() } }))

const registerTenant = vi.fn()
const updateMe = vi.fn()
vi.mock('@/services/auth/auth.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/auth/auth.api')>()),
  authApi: {
    registerTenant: (...args: unknown[]) => registerTenant(...args),
    updateMe: (...args: unknown[]) => updateMe(...args),
  },
}))

// A return to the step reads and saves the company, and may move its starter branch.
const companyGet = vi.fn()
const companyUpdate = vi.fn()
vi.mock('@/modules/settings/api/company.api', () => ({
  companyApi: { get: () => companyGet(), update: (patch: unknown) => companyUpdate(patch) },
}))
const locationList = vi.fn()
const locationUpdate = vi.fn()
vi.mock('@/modules/locations/api/location.api', () => ({
  locationApi: {
    list: () => locationList(),
    update: (id: string, input: unknown) => locationUpdate(id, input),
  },
}))

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/onboarding/plan" element={<p>Plan step</p>} />
          <Route path="/dashboard" element={<p>Dashboard</p>} />
        </Routes>
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
  await user.click(await screen.findByRole('option', { name: '21-50 vehicles' }))
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
  billingGet.mockReset()
  billingGet.mockResolvedValue({ enabled: true })
  useOrganizationStore.setState({ membership: null })
  for (const mock of [updateMe, companyGet, companyUpdate, locationList, locationUpdate]) mock.mockReset()
  companyGet.mockResolvedValue(SAVED_COMPANY)
  companyUpdate.mockImplementation(async (patch: object) => ({ ...SAVED_COMPANY, ...patch }))
  locationList.mockResolvedValue([STARTER_BRANCH])
  locationUpdate.mockResolvedValue(STARTER_BRANCH)
})

const SAVED_COMPANY = {
  id: 't_1',
  name: 'Sunstate Car Co.',
  subdomain: 'sunstate-car-co',
  fleetSize: '6_20',
  country: 'US',
  timezone: 'America/New_York',
  currency: 'USD',
  currencyLocked: false,
  listingLanguage: 'en',
  address: '1450 Alton Road, Miami Beach, FL 33139',
}
const STARTER_BRANCH = {
  id: 'loc_1',
  name: 'Main Office',
  address: SAVED_COMPANY.address,
  originalAddress: SAVED_COMPANY.address,
  status: 'Open',
  openingDays: 'monSun',
  opensAt: 480,
  closesAt: 1200,
  isDefault: true,
  vehicleCount: 0,
}

const MEMBERSHIP = {
  tenantId: 't_1',
  tenantName: 'Sunstate Car Co.',
  subdomain: 'sunstate-car-co',
  currency: 'USD',
  timezone: 'America/New_York',
  role: 'owner' as const,
}

describe('OnboardingPage', () => {
  it('fills the company URL from the company name, and sends it', async () => {
    const user = userEvent.setup({ delay: null })
    renderPage()

    expect(screen.queryByLabelText(/Company website/)).not.toBeInTheDocument()

    await fillRequiredFields(user)
    expect(screen.getByLabelText(/Company URL/)).toHaveValue('sunstate-car-co')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(registerTenant).toHaveBeenCalledTimes(1))
    expect(registerTenant.mock.calls[0][0].subdomain).toBe('sunstate-car-co')
  })

  it('keeps a URL typed by hand when the name changes, and sends it lowercased', async () => {
    const user = userEvent.setup({ delay: null })
    renderPage()

    await fillRequiredFields(user)
    const url = screen.getByLabelText(/Company URL/)
    await user.clear(url)
    await user.type(url, 'Sunstate-Miami')
    await user.type(screen.getByLabelText(/Company name/), ' Rentals')
    expect(url).toHaveValue('Sunstate-Miami')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(registerTenant).toHaveBeenCalledTimes(1))
    expect(registerTenant.mock.calls[0][0].subdomain).toBe('sunstate-miami')
  })

  it('follows the name again once the URL is cleared', async () => {
    const user = userEvent.setup({ delay: null })
    renderPage()

    const url = screen.getByLabelText(/Company URL/)
    await user.type(url, 'mine')
    await user.clear(url)
    await user.type(screen.getByLabelText(/Company name/), 'Sunstate')

    expect(url).toHaveValue('sunstate')
  })

  it('hands the URL to the brand panel as it is typed, and takes it back on leaving', async () => {
    const user = userEvent.setup({ delay: null })
    const { unmount } = renderPage()

    await user.type(screen.getByLabelText(/Company name/), 'Sunstate')
    expect(useSitePreviewStore.getState().subdomain).toBe('sunstate')
    await user.type(screen.getByLabelText(/Company URL/), '-Miami')
    expect(useSitePreviewStore.getState().subdomain).toBe('sunstate-miami')

    unmount()
    expect(useSitePreviewStore.getState().subdomain).toBe('')
  })

  it('asks for a URL when the name gives nothing to suggest', async () => {
    const user = userEvent.setup({ delay: null })
    renderPage()

    await fillRequiredFields(user)
    const name = screen.getByLabelText(/Company name/)
    await user.clear(name)
    await user.type(name, '汽车租赁')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Choose your company URL')).toBeInTheDocument()
    expect(registerTenant).not.toHaveBeenCalled()
  })

  it.each([
    ['admin', 'This URL is reserved. Choose another one.'],
    ['-sunstate', 'Use 3-63 lowercase letters, numbers and single hyphens, not at the start or end'],
  ])('stops the URL %s before it reaches the API', async (typed, message) => {
    const user = userEvent.setup({ delay: null })
    renderPage()

    await fillRequiredFields(user)
    const url = screen.getByLabelText(/Company URL/)
    await user.clear(url)
    await user.type(url, typed)
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(registerTenant).not.toHaveBeenCalled()
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

  it('hands the plan step its company and plans, so it opens on them instead of a spinner', async () => {
    const queryClient = new QueryClient()
    registerTenant.mockImplementation(async () => {
      queryClient.setQueryData(['auth', 'me', 'user_1'], { user: {}, membership: MEMBERSHIP })
      meResult.current = { data: { user: {}, membership: MEMBERSHIP } }
      return {}
    })
    let seen: unknown
    function PlanStep() {
      seen = {
        company: useOrganizationStore.getState().membership?.organizationId,
        plans: queryClient.getQueryData(['billing']),
      }
      return <p>Plans</p>
    }
    const user = userEvent.setup({ delay: null })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/onboarding']}>
          <Routes>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/onboarding/plan" element={<PlanStep />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Plans')).toBeInTheDocument()
    // Read on its first render: neither the guard nor the plans had anything left to wait for.
    expect(seen).toEqual({ company: 't_1', plans: { enabled: true } })
  })

  it('stays on screen and busy while the next step loads, so it cannot be submitted twice', async () => {
    registerTenant.mockImplementation(async () => {
      meResult.current = { data: { user: {}, membership: MEMBERSHIP } }
      return {}
    })
    const NeverLoads = lazy(() => new Promise<{ default: () => null }>(() => {}))
    const user = userEvent.setup({ delay: null })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/onboarding']}>
          <Suspense fallback={<p>Loading the next step</p>}>
            <Routes>
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/onboarding/plan" element={<NeverLoads />} />
            </Routes>
          </Suspense>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(registerTenant).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled())
    expect(screen.queryByText('Loading the next step')).not.toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(registerTenant).toHaveBeenCalledTimes(1))
    expect(registerTenant).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantName: 'Sunstate Car Co.',
        subdomain: 'sunstate-car-co',
        ownerFullName: 'Diego Rivas',
        country: 'US',
        fleetSize: '21_50',
      }),
    )
  })

  it('offers the fleet sizes the plans are sized by', async () => {
    const user = userEvent.setup({ delay: null })
    renderPage()

    await user.click(screen.getByLabelText(/Number of vehicles/))

    const options = await screen.findAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual([
      '1-5 vehicles',
      '6-20 vehicles',
      '21-50 vehicles',
      'More than 50 vehicles',
    ])
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
    await user.click(await screen.findByRole('option', { name: '21-50 vehicles' }))

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

  it('puts a taken URL under its field, where it can be changed', async () => {
    registerTenant.mockRejectedValue(TAKEN)
    const user = userEvent.setup({ delay: null })
    renderPage()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    const url = screen.getByLabelText(/Company URL/)
    await waitFor(() => expect(url).toHaveAccessibleDescription(/Another company has this URL/))
    expect(url).toHaveFocus()
    expect(registerTenant).toHaveBeenCalledTimes(1)
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

describe('OnboardingPage, come back to from the stepper', () => {
  beforeEach(() => {
    meResult.current = { data: { user: { fullName: 'Diego Rivas' }, membership: MEMBERSHIP } }
  })

  it('opens on what was saved, and saves only what changed', async () => {
    const user = userEvent.setup({ delay: null })
    renderPage()

    expect(await screen.findByLabelText(/Company name/)).toHaveValue('Sunstate Car Co.')
    expect(screen.getByLabelText(/Your full name/)).toHaveValue('Diego Rivas')
    expect(screen.getByLabelText(/Company URL/)).toHaveValue('sunstate-car-co')
    expect(screen.getByLabelText(/Company address/)).toHaveValue(SAVED_COMPANY.address)
    await user.click(screen.getByLabelText(/Number of vehicles/))
    await user.click(await screen.findByRole('option', { name: '21-50 vehicles' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Plan step')).toBeInTheDocument()
    expect(companyUpdate).toHaveBeenCalledWith({ fleetSize: '21_50' })
    expect(registerTenant).not.toHaveBeenCalled()
    expect(updateMe).not.toHaveBeenCalled()
    expect(locationUpdate).not.toHaveBeenCalled()
  })

  it('keeps the URL when the company name is corrected', async () => {
    const user = userEvent.setup({ delay: null })
    renderPage()

    await user.type(await screen.findByLabelText(/Company name/), ' Rentals')

    // Every field was chosen the first time, so none follows another on a return.
    expect(screen.getByLabelText(/Company URL/)).toHaveValue('sunstate-car-co')
  })

  it('corrects the owner’s name on their own account', async () => {
    const user = userEvent.setup({ delay: null })
    renderPage()

    const name = await screen.findByLabelText(/Your full name/)
    await user.clear(name)
    await user.type(name, 'Diego Herrera')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Plan step')).toBeInTheDocument()
    expect(updateMe).toHaveBeenCalledWith('Diego Herrera')
    expect(companyUpdate).not.toHaveBeenCalled()
  })

  it('moves the starter branch with a corrected address', async () => {
    const user = userEvent.setup({ delay: null })
    renderPage()

    const address = await screen.findByLabelText(/Company address/)
    await user.clear(address)
    await user.type(address, '5 Ocean Drive, Miami Beach')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Plan step')).toBeInTheDocument()
    expect(companyUpdate).toHaveBeenCalledWith({ address: '5 Ocean Drive, Miami Beach' })
    expect(locationUpdate).toHaveBeenCalledWith(
      'loc_1',
      expect.objectContaining({
        name: 'Main Office',
        address: '5 Ocean Drive, Miami Beach',
        originalAddress: '5 Ocean Drive, Miami Beach',
      }),
    )
  })

  it('leaves a branch the owner has already changed where it is', async () => {
    locationList.mockResolvedValue([{ ...STARTER_BRANCH, address: '9 Collins Ave' }])
    const user = userEvent.setup({ delay: null })
    renderPage()

    const address = await screen.findByLabelText(/Company address/)
    await user.clear(address)
    await user.type(address, '5 Ocean Drive, Miami Beach')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Plan step')).toBeInTheDocument()
    expect(locationUpdate).not.toHaveBeenCalled()
  })

  it('puts a rejected company name under the field it was typed in', async () => {
    companyUpdate.mockRejectedValue(
      new ApiError('validation', 'Request validation failed', {
        status: 422,
        fieldErrors: [{ field: 'name', message: 'Too long for a company name' }],
      }),
    )
    const user = userEvent.setup({ delay: null })
    renderPage()

    await user.type(await screen.findByLabelText(/Company name/), ' Rentals')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() =>
      expect(screen.getByLabelText(/Company name/)).toHaveAccessibleDescription(
        'Too long for a company name',
      ),
    )
  })

  it('sends someone who does not own the company to the dashboard', async () => {
    meResult.current = { data: { user: { fullName: 'Ana' }, membership: { ...MEMBERSHIP, role: 'staff' } } }
    renderPage()

    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
    expect(companyGet).not.toHaveBeenCalled()
  })
})
