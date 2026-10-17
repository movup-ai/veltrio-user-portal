import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { Booking } from '@/modules/bookings/types/booking.types'
import type { Customer } from '@/modules/customers/types/customer.types'
import type { Vehicle } from '@/modules/vehicles/types/vehicle.types'
import { useOrganizationStore } from '@/state/organization.store'
import { ROLE_PERMISSIONS } from '@/utils/permissions'
import type { Matches } from '../types/search.types'
import { GlobalSearch } from './GlobalSearch'

const bookings = vi.fn<(term: string) => Promise<Matches<Booking>>>()
const vehicles = vi.fn<(term: string) => Promise<Matches<Vehicle>>>()
const customers = vi.fn<(term: string) => Promise<Matches<Customer>>>()

vi.mock('../api/search.api', () => ({
  searchApi: {
    bookings: (term: string) => bookings(term),
    vehicles: (term: string) => vehicles(term),
    customers: (term: string) => customers(term),
  },
}))

const BOOKING = {
  id: 'b-1',
  reference: 'BK-10002',
  customer: { name: 'Kevin Ragira' },
  vehicleName: 'Honda Accord',
  vehiclePlate: 'ABC123',
} as Booking

function Location() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname + location.search}</output>
}

function renderSearch() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <GlobalSearch />
        <Location />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  useOrganizationStore.setState({
    membership: {
      organizationId: 'o',
      organizationName: 'Coastline Rentals',
      subdomain: 'c',
      currency: 'USD',
      role: 'staff',
      permissions: ROLE_PERMISSIONS.staff,
    },
  })
  bookings.mockResolvedValue({ items: [BOOKING], total: 7 })
  vehicles.mockResolvedValue({ items: [], total: 0 })
  customers.mockResolvedValue({ items: [], total: 0 })
})

afterEach(() => {
  vi.clearAllMocks()
  useOrganizationStore.setState({ membership: null })
})

describe('GlobalSearch', () => {
  it('opens from the keyboard and finds a booking to open', async () => {
    const user = userEvent.setup({ delay: null })
    renderSearch()

    await user.keyboard('{Control>}k{/Control}')
    await user.type(screen.getByRole('combobox', { name: 'Search' }), 'kevin')

    expect(await screen.findByRole('option', { name: /BK-10002 · Kevin Ragira/ })).toBeInTheDocument()
    expect(bookings).toHaveBeenCalledWith('kevin')
    // Pages that match come first; none matches "kevin", so the booking is what Enter opens.
    await user.keyboard('{Enter}')

    expect(screen.getByTestId('location')).toHaveTextContent('/bookings/BK-10002')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('walks to the whole list with the arrow keys, opened on the same search', async () => {
    const user = userEvent.setup({ delay: null })
    renderSearch()

    await user.click(screen.getByRole('button', { name: 'Global search' }))
    await user.type(screen.getByRole('combobox'), 'kevin')
    await screen.findByRole('option', { name: 'See all 7 bookings' })
    await user.keyboard('{ArrowDown}{Enter}')

    expect(screen.getByTestId('location')).toHaveTextContent('/bookings?search=kevin')
  })

  it('goes to a page by its name, and only to pages the role can see', async () => {
    const user = userEvent.setup({ delay: null })
    renderSearch()

    await user.click(screen.getByRole('button', { name: 'Global search' }))
    const pages = screen.getByRole('group', { name: 'Go to' })
    expect(within(pages).queryByRole('option', { name: 'Users' })).not.toBeInTheDocument()
    await user.type(screen.getByRole('combobox'), 'pay')
    await user.click(await screen.findByRole('option', { name: 'Payments' }))

    expect(screen.getByTestId('location')).toHaveTextContent('/payments')
  })

  it('says what it needs and what it found', async () => {
    const user = userEvent.setup({ delay: null })
    bookings.mockResolvedValue({ items: [], total: 0 })
    renderSearch()

    await user.click(screen.getByRole('button', { name: 'Global search' }))
    await user.type(screen.getByRole('combobox'), 'z')
    expect(screen.getByText(/Type at least two letters/)).toBeInTheDocument()
    await user.type(screen.getByRole('combobox'), 'zq')

    expect(await screen.findByText('No bookings, vehicles or customers match “zzq”.')).toBeInTheDocument()
  })
})
