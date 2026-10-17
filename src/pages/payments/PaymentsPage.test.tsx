import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { toPaginatedResult } from '@/lib/pagination'
import type { PaginatedResult } from '@/types/common'
import type { PaymentListParams, PaymentRow, PaymentStats } from '@/modules/payments/types/payment.types'

const page = vi.fn<(params: PaymentListParams) => Promise<PaginatedResult<PaymentRow>>>()
const stats = vi.fn<() => Promise<PaymentStats>>()

vi.mock('@/modules/payments/api/payment.api', () => ({
  paymentApi: {
    page: (params: PaymentListParams) => page(params),
    stats: () => stats(),
    methodsInUse: () => Promise.resolve([]),
  },
}))

const { PaymentsPage } = await import('./PaymentsPage')

const PAYMENTS: PaymentRow[] = Array.from({ length: 11 }, (_, index) => ({
  id: `pay-${index + 1}`,
  kind: 'charge',
  state: 'paid',
  amount: 120,
  refunded: 0,
  currency: 'USD',
  at: '2026-10-01T10:00:00Z',
  bookingReference: `BK-${index + 1}`,
  customerName: `Renter ${index + 1}`,
}))

const STATS: PaymentStats = {
  collected: 1500,
  refunded: 40,
  outstanding: 300,
  outstandingBookings: 2,
  failed: 1,
  held: 250,
  heldCount: 1,
  expiringHolds: 0,
}

/** How many payments the company has: a link withdrawn elsewhere lowers it mid-test. */
let total = PAYMENTS.length

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PaymentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  total = PAYMENTS.length
  stats.mockReset()
  page.mockReset()
  page.mockImplementation((params) => {
    const start = (params.page - 1) * params.pageSize
    const items = PAYMENTS.slice(0, total).slice(start, start + params.pageSize)
    return Promise.resolve(toPaginatedResult(items, total, params))
  })
})

describe('the payment totals', () => {
  it('are not shown as zero while they load', async () => {
    stats.mockReturnValue(new Promise(() => {}))
    renderPage()

    await screen.findByText('Renter 1')
    expect(screen.queryAllByText(/\$0/)).toHaveLength(0)
  })

  it('offer a retry instead of zero balances when they fail', async () => {
    // The list loading fine used to leave "$0 collected" as the only word on the totals.
    stats.mockRejectedValueOnce(new Error('boom'))
    const user = userEvent.setup({ delay: null })
    renderPage()

    await screen.findByText('Renter 1')
    expect(await screen.findByText("We couldn't load your payment totals.")).toBeInTheDocument()
    expect(screen.queryAllByText(/\$0/)).toHaveLength(0)

    stats.mockResolvedValueOnce(STATS)
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('$1,500')).toBeInTheDocument()
  })
})

describe('the payment list', () => {
  it('goes back to the last page that exists when the one asked for is gone', async () => {
    // Eleven payments make two pages; one is withdrawn elsewhere before page 2 is opened.
    stats.mockResolvedValue(STATS)
    const user = userEvent.setup({ delay: null })
    renderPage()
    await screen.findByText('Renter 1')

    total = 10
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => expect(page.mock.calls.map(([params]) => params.page)).toEqual([1, 2, 1]))
    expect(screen.getByText('Renter 1')).toBeInTheDocument()
    expect(screen.queryByText('No payments found')).not.toBeInTheDocument()
  })

  it('says nothing matches a tab, rather than how payments first appear', async () => {
    stats.mockResolvedValue(STATS)
    total = 0
    const user = userEvent.setup({ delay: null })
    renderPage()
    expect(await screen.findByText('No payments found')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Failed' }))

    expect(await screen.findByText('No payments match')).toBeInTheDocument()
    expect(screen.queryByText(/Payments appear here/)).not.toBeInTheDocument()
  })
})
