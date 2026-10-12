import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { PaymentStats } from '@/modules/payments/types/payment.types'
import { PaymentsPage } from './PaymentsPage'

const statsQuery = vi.hoisted(() => ({
  data: undefined as PaymentStats | undefined,
  isLoading: false,
  isError: false,
}))
vi.mock('@/modules/payments/hooks/use-payments', () => ({
  usePaymentStats: () => statsQuery,
  usePaymentPage: () => ({
    data: { items: [], page: 1, pageSize: 10, total: 0, totalPages: 1 },
    isLoading: false,
    isError: false,
    isStale: false,
  }),
  usePaymentMethodsInUse: () => ({ data: [] }),
  usePaymentReceipt: () => ({ mutate: vi.fn() }),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <PaymentsPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  Object.assign(statsQuery, { data: undefined, isLoading: false, isError: false })
})

describe('PaymentsPage statistics', () => {
  it('shows loading values while statistics load independently of the list', () => {
    statsQuery.isLoading = true
    renderPage()
    expect(screen.getAllByText('Loading…')).toHaveLength(7)
    expect(screen.queryByText('$0')).not.toBeInTheDocument()
  })

  it.each([
    undefined,
    {
      collected: 100,
      refunded: 20,
      outstanding: 30,
      outstandingBookings: 1,
      failed: 2,
      held: 40,
      heldCount: 3,
    },
  ])('shows unavailable values after failure even with cached data %j', (data) => {
    Object.assign(statsQuery, { data, isError: true })
    renderPage()
    expect(screen.getAllByText('Unavailable')).toHaveLength(7)
    expect(screen.queryByText('$0')).not.toBeInTheDocument()
    expect(screen.queryByText('$100')).not.toBeInTheDocument()
  })

  it('shows real zeros when statistics successfully load', () => {
    statsQuery.data = {
      collected: 0,
      refunded: 0,
      outstanding: 0,
      outstandingBookings: 0,
      failed: 0,
      held: 0,
      heldCount: 0,
    }
    renderPage()
    expect(screen.getAllByText('$0')).toHaveLength(3)
    expect(screen.queryByText('Unavailable')).not.toBeInTheDocument()
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
  })
})
