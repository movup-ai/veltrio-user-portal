import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { BookingPayments, PaymentActions } from '@/modules/payments/types/booking-payment.types'
import { BookingHandoverAction } from './BookingHandoverAction'

const payments = vi.fn<() => Promise<BookingPayments>>()
const contract = vi.fn<() => Promise<{ status: string }>>()
const close = vi.fn<(reference: string) => Promise<unknown>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))
vi.mock('@/modules/payments/api/booking-payment.api', () => ({
  bookingPaymentApi: { get: () => payments() },
}))
vi.mock('@/modules/contracts/api/booking-contract.api', () => ({
  bookingContractApi: { get: () => contract() },
}))
vi.mock('../api/booking.api', () => ({
  bookingApi: { close: (reference: string) => close(reference) },
}))

const OFF = { allowed: false } as const
const ACTIONS: PaymentActions = {
  sendLink: { allowed: true },
  linkIncludesDeposit: false,
  markPaid: { allowed: true },
  requestDeposit: { allowed: true },
  captureDeposit: OFF,
  releaseDeposit: OFF,
  pickUp: { allowed: false, reason: 'not_fully_paid' },
  returnVehicle: { allowed: false, reason: 'not_on_rental' },
  close: { allowed: false, reason: 'not_awaiting_close' },
}
const UNPAID: BookingPayments = {
  available: true,
  state: 'unpaid',
  currency: 'USD',
  total: 319,
  paid: 0,
  refunded: 0,
  balance: 319,
  depositAmount: 2000,
  openLink: false,
  depositRequested: false,
  actions: ACTIONS,
  payments: [],
}
const BACK = { ...ACTIONS, pickUp: { allowed: false, reason: 'not_before_pickup' } } as PaymentActions

/** The provider is mounted app-wide; the tooltip renders nothing without it. */
function renderAction() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TooltipProvider delayDuration={0}>
        <BookingHandoverAction reference="BK-10001" />
      </TooltipProvider>
    </QueryClientProvider>,
  )
  return userEvent.setup({ delay: null })
}

/** A disabled button fires no hover of its own, so the tooltip opens from the span around it. */
async function hover(user: ReturnType<typeof userEvent.setup>, name: string) {
  const button = await screen.findByRole('button', { name })
  await user.hover(button.parentElement as HTMLElement)
  return within(await screen.findByRole('tooltip'))
}

describe('BookingHandoverAction', () => {
  beforeEach(() => {
    for (const mock of [payments, contract, close]) mock.mockReset()
    contract.mockResolvedValue({ status: 'none' })
  })

  it('lists on hover everything the handover is waiting for, not only the first thing', async () => {
    payments.mockResolvedValue(UNPAID)
    const user = renderAction()

    expect(await screen.findByRole('button', { name: 'Hand over vehicle' })).toBeDisabled()
    const tooltip = await hover(user, 'Hand over vehicle')

    expect(tooltip.getByText('Waiting for')).toBeInTheDocument()
    for (const need of ['Payment', 'Deposit hold', 'Signed agreement']) {
      expect(tooltip.getByText(need)).toBeInTheDocument()
    }
  })

  it('drops from the list what is already done', async () => {
    payments.mockResolvedValue({ ...UNPAID, balance: 0, state: 'rental_paid' })
    contract.mockResolvedValue({ status: 'signed' })
    const user = renderAction()

    const tooltip = await hover(user, 'Hand over vehicle')

    expect(tooltip.getByText('Deposit hold')).toBeInTheDocument()
    expect(tooltip.queryByText('Payment')).not.toBeInTheDocument()
    expect(tooltip.queryByText('Signed agreement')).not.toBeInTheDocument()
  })

  it('uses the tooltip only, not the browser one that showed a second box over it', async () => {
    payments.mockResolvedValue(UNPAID)
    renderAction()

    expect(await screen.findByRole('button', { name: 'Hand over vehicle' })).not.toHaveAttribute('title')
  })

  it('has no tooltip once the handover can go ahead', async () => {
    payments.mockResolvedValue({
      ...UNPAID,
      state: 'paid',
      balance: 0,
      actions: { ...ACTIONS, pickUp: { allowed: true } },
    })
    const user = renderAction()

    const button = await screen.findByRole('button', { name: 'Hand over vehicle' })
    expect(button).toBeEnabled()
    await user.hover(button)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('says on hover that the deposit has to be settled before a returned booking is closed', async () => {
    payments.mockResolvedValue({
      ...UNPAID,
      actions: { ...BACK, close: { allowed: false, reason: 'deposit_unsettled' } },
    })
    const user = renderAction()

    expect(await screen.findByRole('button', { name: 'Close booking' })).toBeDisabled()
    const tooltip = await hover(user, 'Close booking')

    expect(tooltip.getByText('Deposit release or capture')).toBeInTheDocument()
  })

  it('closes the booking in one click once nothing is left to settle', async () => {
    payments.mockResolvedValue({ ...UNPAID, actions: { ...BACK, close: { allowed: true } } })
    close.mockResolvedValue({})
    const user = renderAction()

    await user.click(await screen.findByRole('button', { name: 'Close booking' }))

    await waitFor(() => expect(close).toHaveBeenCalledWith('BK-10001'))
  })
})
