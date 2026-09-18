import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/types/api'
import { OnboardingPage } from './OnboardingPage'

// Signed in with Clerk, but with no tenant yet — exactly the state this page exists for.
vi.mock('@clerk/clerk-react', () => ({ useAuth: () => ({ isLoaded: true, isSignedIn: true }) }))
vi.mock('@/services/auth/use-me', () => ({
  ME_QUERY_KEY: ['auth', 'me'],
  useMe: () => ({ data: undefined }),
}))

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

  await user.click(screen.getByLabelText(/Operating country/))
  await user.click(await screen.findByRole('button', { name: 'United States' }))

  await user.click(screen.getByLabelText(/Number of vehicles/))
  await user.click(await screen.findByRole('option', { name: '11-50 vehicles' }))
}

beforeEach(() => {
  registerTenant.mockReset()
  registerTenant.mockResolvedValue({})
})

describe('OnboardingPage', () => {
  it('derives the portal address from the company name as it is typed', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/Company name/), 'Peña Car Rentals & Co.')

    expect(screen.getByLabelText(/Portal address/)).toHaveValue('pena-car-rentals-co')
  })

  it('stops tracking the company name once the address is edited by hand', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/Company name/), 'Sunstate')
    await user.clear(screen.getByLabelText(/Portal address/))
    await user.type(screen.getByLabelText(/Portal address/), 'sunstate-rentals')
    await user.type(screen.getByLabelText(/Company name/), ' Car Co.')

    expect(screen.getByLabelText(/Portal address/)).toHaveValue('sunstate-rentals')
  })

  it('resumes tracking when the address is cleared', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/Company name/), 'Sunstate')
    await user.type(screen.getByLabelText(/Portal address/), '-rentals')
    await user.clear(screen.getByLabelText(/Portal address/))
    await user.type(screen.getByLabelText(/Company name/), ' Cars')

    expect(screen.getByLabelText(/Portal address/)).toHaveValue('sunstate-cars')
  })

  it('submits the company profile with the country as an ISO code', async () => {
    const user = userEvent.setup()
    renderPage()

    await fillRequiredFields(user)
    await user.type(screen.getByLabelText(/Company website/), 'sunstate.com')
    await user.click(screen.getByRole('button', { name: 'Finish setup' }))

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
    const user = userEvent.setup()
    renderPage()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Finish setup' }))

    await waitFor(() => expect(registerTenant).toHaveBeenCalledTimes(1))
    expect(registerTenant.mock.calls[0][0].website).toBeUndefined()
  })

  it('blocks submission until a country and fleet size are chosen', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/Your full name/), 'Diego Rivas')
    await user.type(screen.getByLabelText(/Company name/), 'Sunstate Car Co.')
    await user.click(screen.getByRole('button', { name: 'Finish setup' }))

    expect(await screen.findByText('Select the country you operate in')).toBeInTheDocument()
    expect(screen.getByText('Select how many vehicles you operate')).toBeInTheDocument()
    expect(registerTenant).not.toHaveBeenCalled()
  })

  it('explains a taken portal address instead of showing the raw conflict', async () => {
    registerTenant.mockRejectedValue(
      new ApiError('unknown', 'Subdomain is already taken', { status: 409, code: 'subdomain_taken' }),
    )
    const user = userEvent.setup()
    renderPage()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Finish setup' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('That portal address is already taken')
  })
})
