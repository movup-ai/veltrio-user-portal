import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { useOrganizationStore } from '@/state/organization.store'
import { ApiError } from '@/types/api'
import { InvitePage } from './InvitePage'

const clerkEmail = vi.hoisted(() => ({ current: 'jo@example.com' }))
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, userId: 'user_1' }),
  useUser: () => ({
    user: { fullName: 'Jo Rivera', primaryEmailAddress: { emailAddress: clerkEmail.current } },
  }),
  useClerk: () => ({ signOut: vi.fn() }),
}))
// A brand-new account: signed in with Clerk, nothing here yet.
vi.mock('@/services/auth/use-me', () => ({
  ME_QUERY_KEY: ['auth', 'me'],
  useMe: () => ({
    data: undefined,
    isPending: false,
    error: new ApiError('forbidden', '', { status: 403, code: 'user_not_onboarded' }),
  }),
}))
const accept = vi.fn()
vi.mock('@/modules/users/api/users.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/users/api/users.api')>()),
  usersApi: {
    preview: () =>
      Promise.resolve({
        id: 'inv_1',
        companyName: 'ABC Rentals',
        email: 'Jo@example.com',
        role: 'manager',
        expired: false,
      }),
    mine: () => Promise.resolve([]),
    accept: (...args: unknown[]) => accept(...args),
  },
}))

const MEMBERSHIP = {
  tenantId: 't_1',
  tenantName: 'ABC Rentals',
  subdomain: 'abc',
  currency: 'USD',
  timezone: 'America/New_York',
  role: 'manager',
}

function renderLink() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/invite/tok_1']}>
        <Routes>
          <Route path="/invite/:token?" element={<InvitePage />} />
          <Route path="/dashboard" element={<p>Dashboard</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  clerkEmail.current = 'jo@example.com'
  accept.mockReset()
  useOrganizationStore.setState({ membership: null })
})

describe('InvitePage', () => {
  it('joins with the name given, and arrives on the dashboard already in the company', async () => {
    accept.mockResolvedValue({ user: { fullName: 'Jo Rivera' }, membership: MEMBERSHIP })
    const user = userEvent.setup({ delay: null })
    renderLink()

    const name = await screen.findByLabelText(/Your full name/)
    expect(name).toHaveValue('Jo Rivera')
    await user.click(screen.getByRole('button', { name: 'Join ABC Rentals' }))

    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
    expect(accept).toHaveBeenCalledWith('inv_1', 'Jo Rivera')
    expect(useOrganizationStore.getState().membership?.organizationName).toBe('ABC Rentals')
  })

  it('asks for a name before joining', async () => {
    const user = userEvent.setup({ delay: null })
    renderLink()

    await user.clear(await screen.findByLabelText(/Your full name/))
    await user.click(screen.getByRole('button', { name: 'Join ABC Rentals' }))

    expect(screen.getByText('Your full name is required')).toBeInTheDocument()
    expect(accept).not.toHaveBeenCalled()
  })

  it('explains a failed join in translated words, not the English the API sent', async () => {
    accept.mockRejectedValue(
      new ApiError('not_found', 'This invitation has expired', { status: 410, code: 'invitation_expired' }),
    )
    const user = userEvent.setup({ delay: null })
    renderLink()

    await screen.findByLabelText(/Your full name/)
    await user.click(screen.getByRole('button', { name: 'Join ABC Rentals' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This invitation has expired. Ask the company to send you a new one.',
    )
  })

  it('names both addresses when another account is signed in, instead of offering to join', async () => {
    clerkEmail.current = 'sam@example.com'
    renderLink()

    expect(await screen.findByText(/This invitation is for Jo@example.com/)).toHaveTextContent(
      'sam@example.com',
    )
    expect(screen.queryByRole('button', { name: 'Join ABC Rentals' })).not.toBeInTheDocument()
  })
})
