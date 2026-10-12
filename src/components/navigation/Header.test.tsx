import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { useOrganizationStore } from '@/state/organization.store'
import { Header } from './Header'

afterEach(() => useOrganizationStore.setState({ membership: null }))

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

    render(
      <MemoryRouter initialEntries={['/customers']}>
        <Header onMobileMenuClick={() => {}} />
      </MemoryRouter>,
    )

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

    render(
      <MemoryRouter initialEntries={['/customers']}>
        <Header onMobileMenuClick={() => {}} />
      </MemoryRouter>,
    )

    const company = screen.getByText(name)
    expect(company).toHaveClass('truncate')
    expect(company).toHaveAttribute('title', name)
  })
})
