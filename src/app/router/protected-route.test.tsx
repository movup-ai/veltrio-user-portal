import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { useOrganizationStore } from '@/state/organization.store'
import { ApiError } from '@/types/api'
import type { MeResponse } from '@/services/auth/auth.api'
import { ProtectedRoute } from './protected-route'

const authResult = vi.hoisted(() => ({ current: { isLoaded: true, isSignedIn: true } }))
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => authResult.current,
}))

const meResult = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))
vi.mock('@/services/auth/use-me', () => ({
  ME_QUERY_KEY: ['auth', 'me'],
  useMe: () => meResult.current,
}))

const invitationsResult = vi.hoisted(() => ({ current: { isPending: false, data: [] as unknown[] } }))
vi.mock('@/modules/users/hooks/use-invitations', () => ({
  useMyInvitations: () => invitationsResult.current,
}))

function meFor(tenantId: string, subdomain: string): MeResponse {
  return {
    user: {
      id: 'user_1',
      email: 'someone@example.com',
      fullName: 'Someone',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
    } as MeResponse['user'],
    membership: {
      tenantId,
      tenantName: 'Their Company',
      subdomain,
      currency: 'USD',
      timezone: 'America/New_York',
      role: 'owner',
    },
  }
}

/**
 * Stands in for a protected page, reading what one really reads: the store, not the `me`
 * response. Every render is recorded, because the bug this guards against is a single frame
 * — by the time the effects have flushed the DOM already shows the right company, so asking
 * the DOM afterwards proves nothing.
 */
const rendered: string[] = []

function WhatThePageSees() {
  const membership = useOrganizationStore((state) => state.membership)
  rendered.push(membership?.subdomain ?? 'none')
  return <div data-testid="subdomain">{membership?.subdomain ?? 'none'}</div>
}

function renderGate() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<ProtectedRoute />}>
            <Route index element={<WhatThePageSees />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  authResult.current = { isLoaded: true, isSignedIn: true }
  invitationsResult.current = { isPending: false, data: [] }
  useOrganizationStore.setState({ membership: null })
  rendered.length = 0
})

describe('ProtectedRoute', () => {
  it('renders the page once the company reaches the store', async () => {
    meResult.current = { data: meFor('tenant_a', 'abc-rentals'), isPending: false, error: null }

    renderGate()

    expect(await screen.findByTestId('subdomain')).toHaveTextContent('abc-rentals')
  })

  /**
   * The case the gate exists for: a second person signs in without the tab ever reloading.
   * The store still holds whoever was here before, and a page rendered against it shows their
   * company — the subdomain in customer-facing links, and the permissions on every action.
   */
  it('never renders a page against the previous account', async () => {
    useOrganizationStore.setState({
      membership: {
        organizationId: 'tenant_a',
        organizationName: 'First Company',
        subdomain: 'first-co',

        currency: 'USD',
        role: 'owner',
        permissions: [],
      },
    })
    meResult.current = { data: meFor('tenant_b', 'second-co'), isPending: false, error: null }

    renderGate()

    await waitFor(() => expect(screen.getByTestId('subdomain')).toHaveTextContent('second-co'))
    // Not just where it settled: the page must never have been rendered at all while the
    // store still held the account before it.
    expect(rendered).not.toContain('first-co')
    expect(rendered).toEqual(['second-co'])
  })

  it('sends a signed-out visitor to sign in with the page to come back to', () => {
    authResult.current = { isLoaded: true, isSignedIn: false }
    meResult.current = { data: undefined, isPending: true, error: null }
    function LoginProbe() {
      const { search } = useLocation()
      return <div data-testid="redirect">{new URLSearchParams(search).get('redirect_url')}</div>
    }

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/bookings/b_1?tab=payments']}>
          <Routes>
            <Route path="/login" element={<LoginProbe />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/bookings/:id" element={<div />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByTestId('redirect')).toHaveTextContent(
      `${window.location.origin}/bookings/b_1?tab=payments`,
    )
  })

  it('sends an account not set up yet to be asked about invitations, not to the company step', () => {
    meResult.current = {
      data: undefined,
      isPending: false,
      error: new ApiError('forbidden', '', { status: 403, code: 'user_not_onboarded' }),
    }
    function Where() {
      return <div data-testid="where">{useLocation().pathname}</div>
    }
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div />} />
            </Route>
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByTestId('where').textContent).toBe('/onboarding/start')
  })

  describe('an account with no company', () => {
    function renderWithoutCompany() {
      meResult.current = { data: { ...meFor('', ''), membership: null }, isPending: false, error: null }
      function Where() {
        const { pathname, search } = useLocation()
        return <div data-testid="where">{pathname + search}</div>
      }
      render(
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<div />} />
              </Route>
              <Route path="*" element={<Where />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      )
    }

    it('is taken to an open invitation, the way back in for someone removed', () => {
      invitationsResult.current = { isPending: false, data: [{ id: 'inv_1', expired: false }] }

      renderWithoutCompany()

      expect(screen.getByTestId('where')).toHaveTextContent('/invite')
    })

    it('is offered a company of its own when nobody has invited it', async () => {
      renderWithoutCompany()

      await userEvent
        .setup({ delay: null })
        .click(screen.getByRole('button', { name: 'Set up your own company' }))

      expect(screen.getByTestId('where').textContent).toBe('/onboarding')
    })
  })
})
