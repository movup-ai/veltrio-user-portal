import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { toPaginatedResult } from '@/lib/pagination'
import type { CustomerListParams, CustomerStats } from '@/modules/customers/types/customer.types'

const stats = vi.fn<() => Promise<CustomerStats>>()

vi.mock('@/modules/customers/api/customer.api', () => ({
  customerApi: {
    page: (params: CustomerListParams) => Promise.resolve(toPaginatedResult([], 0, params)),
    stats: () => stats(),
  },
}))

const { CustomersPage } = await import('./CustomersPage')

const STATS: CustomerStats = { total: 42, rented: 20, repeat: 5, possibleDuplicates: 3 }

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CustomersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  stats.mockReset()
})

describe('the customer totals', () => {
  it('are not shown as zero while they load', async () => {
    stats.mockReturnValue(new Promise(() => {}))
    renderPage()

    await screen.findByText('No customers found')
    expect(screen.getAllByText('—')).toHaveLength(3)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
  })

  it('offer a retry instead of zeros when they fail', async () => {
    stats.mockRejectedValueOnce(new Error('boom'))
    const user = userEvent.setup({ delay: null })
    renderPage()

    expect(await screen.findByText("We couldn't load your customer totals.")).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()

    stats.mockResolvedValueOnce(STATS)
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('42')).toBeInTheDocument()
  })
})

describe('an empty customer list', () => {
  it('says nothing matches a search, rather than that customers appear after a booking', async () => {
    stats.mockResolvedValue(STATS)
    const user = userEvent.setup({ delay: null })
    renderPage()

    expect(await screen.findByText('No customers found')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Search name, email, phone or licence'), 'zed')

    expect(await screen.findByText('No customers match your search')).toBeInTheDocument()
    expect(screen.queryByText(/Customers appear here/)).not.toBeInTheDocument()
  })
})
