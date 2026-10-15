import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { useOrganizationStore } from '@/state/organization.store'
import { useUIStore } from '@/state/ui.store'
import type { MembershipRole } from '@/types/user'
import { ROLE_PERMISSIONS } from '@/utils/permissions'
import { Sidebar } from './Sidebar'

const bookings = () => screen.getByRole('link', { name: /Bookings/ })

describe('Sidebar badges', () => {
  // The "system" theme asks `matchMedia`, which jsdom does not have.
  beforeEach(() => useUIStore.setState({ theme: 'light', sidebarCollapsed: false }))

  it('shows the count it is given beside its link', () => {
    render(
      <MemoryRouter>
        <Sidebar badges={{ Bookings: '3' }} />
      </MemoryRouter>,
    )

    expect(bookings()).toHaveTextContent('3')
  })

  it('shows no number on Bookings when nothing is waiting', () => {
    // It used to read a fixed "12", whatever the book held.
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    )

    expect(bookings()).toHaveTextContent(/^Bookings$/)
  })
})

const account = (overrides = {}) => ({
  name: 'Ana López',
  role: 'manager' as const,
  organization: 'Coastline Rentals',
  onOpenProfile: vi.fn(),
  onSignOut: vi.fn(),
  ...overrides,
})

describe('Sidebar account', () => {
  beforeEach(() => useUIStore.setState({ theme: 'light', sidebarCollapsed: false }))

  it('shows the signed-in account it is given', () => {
    // It used to read a fixed "Diego Rivas, Owner", whoever was signed in.
    render(
      <MemoryRouter>
        <Sidebar account={account()} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Ana López')).toBeInTheDocument()
    expect(screen.getByText('AL')).toBeInTheDocument()
    expect(screen.getByText('Manager · Coastline Rentals')).toBeInTheDocument()
    expect(screen.queryByText('Diego Rivas')).not.toBeInTheDocument()
  })

  it.each([
    ['Sign out', 'onSignOut'],
    ['Profile & security', 'onOpenProfile'],
  ] as const)('offers %s from the account card', async (label, handler) => {
    // There was no way to sign out at all, and one session per browser left a shared counter
    // computer stuck on whoever signed in first.
    const user = userEvent.setup({ delay: null })
    const props = account()
    render(
      <MemoryRouter>
        <Sidebar account={props} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    await user.click(screen.getByRole('menuitem', { name: label }))

    expect(props[handler]).toHaveBeenCalledOnce()
  })
})

describe('Sidebar links by role', () => {
  beforeEach(() => useUIStore.setState({ theme: 'light', sidebarCollapsed: false }))
  afterEach(() => useOrganizationStore.setState({ membership: null }))

  function renderAs(role: MembershipRole) {
    useOrganizationStore.setState({
      membership: {
        organizationId: 't_1',
        organizationName: 'Coastline Rentals',
        subdomain: 'coastline',
        currency: 'USD',
        timezone: 'America/New_York',
        role,
        permissions: ROLE_PERMISSIONS[role],
      },
    })
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    )
  }

  it('lists Users for an owner, just above Settings', () => {
    renderAs('owner')

    const names = screen.getAllByRole('link').map((link) => link.textContent)
    expect(names.slice(-2)).toEqual(['Users', 'Settings'])
  })

  it.each(['manager', 'staff'] as const)(
    'leaves Users out for %s, who could only see a notice there',
    (role) => {
      renderAs(role)

      expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
    },
  )
})
