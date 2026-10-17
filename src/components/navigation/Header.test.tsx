import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { useOrganizationStore } from '@/state/organization.store'
import { Header } from './Header'

vi.mock('@/modules/notifications/api/notifications.api', () => ({
  notificationsApi: { unreadCount: async () => ({ notifications: 0, announcements: 0 }) },
}))

afterEach(() => useOrganizationStore.setState({ membership: null }))

function renderHeader(path = '/customers') {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Header onMobileMenuClick={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Header breadcrumb', () => {
  it('starts with the signed-in company', () => {
    // It used to read a fixed "Sunstate Car Co.", whichever company was signed in.
    useOrganizationStore.setState({
      membership: {
        organizationId: 'org-1',
        organizationName: 'Coastline Rentals',
        subdomain: 'coastline',
        currency: 'USD',
        role: 'owner',
        permissions: [],
      },
    })

    renderHeader()

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(breadcrumb).toHaveTextContent('Coastline Rentals/Customers')
    expect(breadcrumb).not.toHaveTextContent('Sunstate')
  })

  it('keeps a long company name from pushing the header controls away', () => {
    // A name may run to 200 characters, and the breadcrumb neither wraps nor shrinks.
    const name = 'Coastline Premium Car and Van Rentals of the Greater Bay Area'
    useOrganizationStore.setState({
      membership: {
        organizationId: 'org-1',
        organizationName: name,
        subdomain: 'coastline',
        currency: 'USD',
        role: 'owner',
        permissions: [],
      },
    })

    renderHeader()

    const company = screen.getByText(name)
    expect(company).toHaveClass('truncate')
    expect(company).toHaveAttribute('title', name)
  })

  it('names a page the sidebar does not list', () => {
    // It fell back to "Dashboard" for any path without a sidebar link.
    renderHeader('/notifications/settings')

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('Notifications')
  })
})
