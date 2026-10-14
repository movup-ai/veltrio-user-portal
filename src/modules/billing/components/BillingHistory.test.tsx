import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { BillingHistory as History, Charge } from '../types/billing.types'
import { BillingHistory } from './BillingHistory'

const history = vi.fn<() => Promise<History>>()

vi.mock('../api/billing.api', () => ({ billingApi: { history: () => history() } }))

const SUBSCRIPTION: Charge = {
  id: 'in_2',
  kind: 'subscription',
  status: 'paid',
  amount: 99,
  currency: 'USD',
  // Midday UTC, so the day reads the same in whichever zone the tests run.
  at: '2026-10-14T12:00:00Z',
  number: 'VEL-0002',
  invoiceUrl: 'https://pay.stripe.test/invoice/in_2/pdf',
}

const RECHARGE: Charge = {
  id: 'pi_1',
  kind: 'autoRecharge',
  status: 'paid',
  amount: 45,
  currency: 'USD',
  at: '2026-10-12T12:00:00Z',
  receiptUrl: 'https://pay.stripe.test/receipts/pi_1',
}

function renderHistory() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BillingHistory />
    </QueryClientProvider>,
  )
}

/** The row for one charge, found by what it was for. */
async function row(name: string) {
  return within((await screen.findByText(name)).closest('li') as HTMLElement)
}

afterEach(() => {
  history.mockReset()
})

describe('BillingHistory', () => {
  it('lists each charge with its date, amount, status and the invoice to download', async () => {
    history.mockResolvedValue({ charges: [SUBSCRIPTION], hasMore: false })
    renderHistory()

    const charge = await row('Subscription')
    expect(charge.getByText(/Oct 14, 2026/)).toBeInTheDocument()
    expect(charge.getByText(/VEL-0002/)).toBeInTheDocument()
    expect(charge.getByText('$99')).toBeInTheDocument()
    expect(charge.getByText('Paid')).toBeInTheDocument()
    expect(charge.getByRole('link', { name: 'Download invoice VEL-0002' })).toHaveAttribute(
      'href',
      SUBSCRIPTION.invoiceUrl,
    )
  })

  it('offers the receipt of a pack auto-recharge bought, which has no invoice', async () => {
    history.mockResolvedValue({ charges: [RECHARGE], hasMore: false })
    renderHistory()

    const charge = await row('Credits bought by auto-recharge')
    expect(charge.getByRole('link', { name: /View receipt/ })).toHaveAttribute('href', RECHARGE.receiptUrl)
    expect(charge.queryByRole('link', { name: /Download invoice/ })).not.toBeInTheDocument()
  })

  it('marks an invoice still to be paid, and one credited back by a plan change', async () => {
    history.mockResolvedValue({
      charges: [
        { ...SUBSCRIPTION, id: 'in_4', status: 'open', number: 'VEL-0004' },
        { ...SUBSCRIPTION, id: 'in_3', kind: 'planChange', amount: -60, number: 'VEL-0003' },
      ],
      hasMore: false,
    })
    renderHistory()

    expect((await row('Subscription')).getByText('Due')).toBeInTheDocument()
    expect((await row('Plan change')).getByText('-$60')).toBeInTheDocument()
  })

  it('says where the older invoices are when Stripe holds more than are listed', async () => {
    history.mockResolvedValue({ charges: [SUBSCRIPTION], hasMore: true })
    renderHistory()

    expect(await screen.findByText(/Older invoices are under Manage billing/)).toBeInTheDocument()
  })

  it('says so when nothing has been charged yet', async () => {
    history.mockResolvedValue({ charges: [], hasMore: false })
    renderHistory()

    expect(await screen.findByText('No charges yet')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('offers to try again when the history cannot be read', async () => {
    history.mockRejectedValueOnce(new Error('down'))
    history.mockResolvedValue({ charges: [SUBSCRIPTION], hasMore: false })
    const user = userEvent.setup({ delay: null })
    renderHistory()

    await user.click(await screen.findByRole('button', { name: /try again/i }))

    expect(await screen.findByText('Subscription')).toBeInTheDocument()
  })
})
