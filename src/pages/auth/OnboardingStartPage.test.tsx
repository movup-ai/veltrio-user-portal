import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { ApiError } from '@/types/api'
import { OnboardingStartPage } from './OnboardingStartPage'

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, userId: 'user_1' }),
}))
const meResult = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))
vi.mock('@/services/auth/use-me', () => ({ useMe: () => meResult.current }))
const myInvitations = vi.fn()
vi.mock('@/modules/users/api/users.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/users/api/users.api')>()),
  usersApi: { mine: () => myInvitations() },
}))

const NOT_ONBOARDED = new ApiError('forbidden', 'User has not completed onboarding', {
  status: 403,
  code: 'user_not_onboarded',
})
const invitation = (expired: boolean) => ({
  id: 'inv_1',
  companyName: 'ABC Rentals',
  role: 'staff',
  expiresAt: '2026-10-22T00:00:00Z',
  expired,
})

/** Every page this one can hand over to, so a test reads where it went. */
function renderStart() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/onboarding/start']}>
        <Routes>
          <Route path="/onboarding/start" element={<OnboardingStartPage />} />
          <Route path="/onboarding" element={<p>Company step</p>} />
          <Route path="/invite" element={<p>Invitations</p>} />
          <Route path="/dashboard" element={<p>Dashboard</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  meResult.current = { data: undefined, error: NOT_ONBOARDED, isPending: false }
  myInvitations.mockReset()
})

describe('OnboardingStartPage', () => {
  it('sends a new account with an invitation to join, never past the company step', async () => {
    myInvitations.mockResolvedValue([invitation(false)])
    renderStart()

    expect(await screen.findByText('Invitations')).toBeInTheDocument()
  })

  it('sends a new account with no invitation to set up its company', async () => {
    myInvitations.mockResolvedValue([])
    renderStart()

    expect(await screen.findByText('Company step')).toBeInTheDocument()
  })

  it('does not hold a new account to an invitation that has expired', async () => {
    myInvitations.mockResolvedValue([invitation(true)])
    renderStart()

    expect(await screen.findByText('Company step')).toBeInTheDocument()
  })

  it('shows neither step while it is still asking', () => {
    myInvitations.mockReturnValue(new Promise(() => {}))
    renderStart()

    expect(screen.queryByText('Company step')).not.toBeInTheDocument()
    expect(screen.queryByText('Invitations')).not.toBeInTheDocument()
  })

  it('sends an account that already has a company to the dashboard, without asking', async () => {
    meResult.current = { data: { user: {}, membership: { role: 'staff' } }, isPending: false }
    renderStart()

    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
    expect(myInvitations).not.toHaveBeenCalled()
  })

  it('stops on a failed account read with a retry, rather than read it as having no company', async () => {
    const refetch = vi.fn()
    meResult.current = {
      data: undefined,
      isPending: false,
      error: new ApiError('network_error', 'Could not reach the server'),
      refetch,
    }
    renderStart()

    await userEvent.setup({ delay: null }).click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText('Could not reach the server')).toBeInTheDocument()
    expect(refetch).toHaveBeenCalledOnce()
    expect(screen.queryByText('Company step')).not.toBeInTheDocument()
    expect(myInvitations).not.toHaveBeenCalled()
  })

  it('stops on a failed invitation check with a retry, rather than read it as no invitation', async () => {
    myInvitations.mockRejectedValueOnce(new ApiError('server_error', 'Something went wrong', { status: 500 }))
    myInvitations.mockResolvedValueOnce([invitation(false)])
    renderStart()

    await userEvent.setup({ delay: null }).click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Invitations')).toBeInTheDocument()
    expect(myInvitations).toHaveBeenCalledTimes(2)
  })
})
