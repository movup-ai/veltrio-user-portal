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
    const users = names.indexOf('Users')
    expect(names.slice(users, users + 2)).toEqual(['Users', 'Settings'])
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

describe('Sidebar on a phone and on a desktop', () => {
  const aside = () => screen.getByRole('complementary')

  function stubViewport(desktop: boolean) {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: desktop && query.includes('min-width'),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )
  }

  beforeEach(() => useUIStore.setState({ theme: 'light', sidebarCollapsed: true }))
  afterEach(() => vi.unstubAllGlobals())

  it('keeps a closed drawer out of the Tab order, and lets an open one in', () => {
    stubViewport(false)
    const { rerender } = render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    )
    expect(aside()).toHaveAttribute('inert')

    rerender(
      <MemoryRouter>
        <Sidebar mobileOpen />
      </MemoryRouter>,
    )
    expect(aside()).not.toHaveAttribute('inert')
  })

  it('shows the drawer with its labels, whatever was collapsed on a desktop', () => {
    stubViewport(false)
    render(
      <MemoryRouter>
        <Sidebar mobileOpen />
      </MemoryRouter>,
    )

    expect(bookings()).toHaveTextContent('Bookings')
  })

  it('closes the drawer on Escape', async () => {
    stubViewport(false)
    const user = userEvent.setup({ delay: null })
    const onMobileClose = vi.fn()
    render(
      <MemoryRouter>
        <Sidebar mobileOpen onMobileClose={onMobileClose} />
      </MemoryRouter>,
    )

    await user.keyboard('{Escape}')

    expect(onMobileClose).toHaveBeenCalledOnce()
  })

  it('lets Escape close an open account menu without closing the drawer', async () => {
    stubViewport(false)
    const user = userEvent.setup({ delay: null })
    const onMobileClose = vi.fn()
    render(
      <MemoryRouter>
        <Sidebar mobileOpen onMobileClose={onMobileClose} account={account()} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(onMobileClose).not.toHaveBeenCalled()
  })

  it('stays reachable and collapsed as chosen on a desktop', () => {
    stubViewport(true)
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    )

    expect(aside()).not.toHaveAttribute('inert')
    expect(bookings()).toHaveTextContent(/^$/)
  })
})

describe('Sidebar groups', () => {
  beforeEach(() => useUIStore.setState({ theme: 'light', sidebarCollapsed: false }))

  function renderSidebar() {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    )
    return screen.getByRole('navigation', { name: 'Primary' })
  }

  it('heads only groups that group something, with the dashboard above them', () => {
    // A "Revenue" over Payments alone and a "Help" over Support alone added lines and grouped nothing.
    const nav = renderSidebar()

    const order = Array.from(nav.children).map((child) => child.textContent)
    expect(order.filter((text) => text === 'Operations' || text === 'Setup')).toEqual(['Operations', 'Setup'])
    expect(nav).not.toHaveTextContent('Revenue')
    expect(nav).not.toHaveTextContent('Help')
    expect(order.indexOf('Dashboard')).toBeLessThan(order.indexOf('Operations'))
  })

  it('lists Payments with the booking flow it belongs to', () => {
    const nav = renderSidebar()

    const links = Array.from(nav.querySelectorAll('a')).map((link) => link.textContent)
    expect(links.slice(1, 4)).toEqual(['Bookings', 'Calendar', 'Payments'])
  })

  it('ends Operations with Support, where it is in reach rather than at the foot', () => {
    const nav = renderSidebar()

    const order = Array.from(nav.children).map((child) => child.textContent)
    expect(order.slice(order.indexOf('Verification'), order.indexOf('Setup'))).toEqual([
      'Verification',
      'Support',
    ])
  })
})
