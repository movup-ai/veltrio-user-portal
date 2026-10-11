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
const pickUp = vi.fn<(reference: string, input: unknown) => Promise<unknown>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))
vi.mock('@/modules/payments/api/booking-payment.api', () => ({
  bookingPaymentApi: { get: () => payments() },
}))
vi.mock('@/modules/contracts/api/booking-contract.api', () => ({
  bookingContractApi: { get: () => contract() },
}))
vi.mock('../api/booking.api', () => ({
  bookingApi: {
    close: (reference: string) => close(reference),
    pickUp: (reference: string, input: unknown) => pickUp(reference, input),
  },
}))
vi.mock('../api/booking-condition-photo.api', () => ({
  conditionPhotoApi: { list: () => Promise.resolve([]) },
  uploadConditionPhoto: vi.fn(),
}))

const OFF = { allowed: false } as const
const ACTIONS: PaymentActions = {
  sendLink: { allowed: true },
  linkIncludesDeposit: false,
  markPaid: { allowed: true },
  requestDeposit: { allowed: true },
  releaseDeposit: OFF,
  setReturnCharges: OFF,
  pickUp: { allowed: false, reason: 'not_fully_paid' },
  returnVehicle: { allowed: false, reason: 'not_on_rental' },
  close: { allowed: false, reason: 'not_awaiting_close' },
  cancel: { allowed: true },
}
const UNPAID: BookingPayments = {
  available: true,
  state: 'unpaid',
  currency: 'USD',
  total: 319,
  paid: 0,
  refunded: 0,
  balance: 319,
  returnCharges: [],
  returnChargesTotal: 0,
  returnChargesSaved: false,
  depositAmount: 2000,
  openLink: false,
  depositRequested: false,
  actions: ACTIONS,
  payments: [],
}
const BACK = { ...ACTIONS, pickUp: { allowed: false, reason: 'not_before_pickup' } } as PaymentActions

/** The provider is mounted app-wide; the tooltip renders nothing without it. */
function renderAction(vehicleMileage?: number) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TooltipProvider delayDuration={0}>
        <BookingHandoverAction reference="BK-10001" vehicleMileage={vehicleMileage} />
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
    for (const mock of [payments, contract, close, pickUp]) mock.mockReset()
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

  it('takes the readings before handing over, rather than handing over in one click', async () => {
    payments.mockResolvedValue({
      ...UNPAID,
      state: 'paid',
      balance: 0,
      actions: { ...ACTIONS, pickUp: { allowed: true } },
    })
    pickUp.mockResolvedValue({})
    const user = renderAction(12000)

    await user.click(await screen.findByRole('button', { name: 'Hand over vehicle' }))

    const form = within(await screen.findByRole('dialog'))
    expect(pickUp).not.toHaveBeenCalled()
    await user.click(form.getByRole('radio', { name: 'Full' }))
    await user.click(form.getByRole('button', { name: 'Hand over vehicle' }))

    await waitFor(() =>
      expect(pickUp).toHaveBeenCalledWith('BK-10001', {
        odometer: 12000,
        fuelLevel: 8,
        notes: '',
        photoIds: [],
      }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('closes the pickup form when the booking turns out to be picked up already', async () => {
    // The pickup was recorded but its answer was lost. The form must not stay open to be
    // submitted again as the next step, a return, carrying the pickup's readings.
    const ready = { ...UNPAID, state: 'paid' as const, balance: 0 }
    payments.mockResolvedValue({ ...ready, actions: { ...ACTIONS, pickUp: { allowed: true } } })
    pickUp.mockRejectedValue(new Error('Network Error'))
    const user = renderAction(12000)
    await user.click(await screen.findByRole('button', { name: 'Hand over vehicle' }))
    const form = within(await screen.findByRole('dialog'))
    await user.click(form.getByRole('radio', { name: 'Full' }))
    payments.mockResolvedValue({ ...ready, actions: { ...BACK, returnVehicle: { allowed: true } } })

    await user.click(form.getByRole('button', { name: 'Hand over vehicle' }))

    expect(await screen.findByRole('button', { name: 'Return vehicle' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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

  it('says on hover that return charges are still to be paid before a booking is closed', async () => {
    payments.mockResolvedValue({
      ...UNPAID,
      actions: { ...BACK, close: { allowed: false, reason: 'charges_unpaid' } },
    })
    const user = renderAction()

    expect(await screen.findByRole('button', { name: 'Close booking' })).toBeDisabled()
    const tooltip = await hover(user, 'Close booking')

    expect(tooltip.getByText('Payment of the return charges')).toBeInTheDocument()
  })

  it('asks before closing a booking, since a closed one takes no more changes', async () => {
    payments.mockResolvedValue({ ...UNPAID, actions: { ...BACK, close: { allowed: true } } })
    close.mockResolvedValue({})
    const user = renderAction()

    await user.click(await screen.findByRole('button', { name: 'Close booking' }))

    const dialog = within(await screen.findByRole('dialog'))
    expect(dialog.getByRole('heading', { name: 'Close this booking?' })).toBeInTheDocument()
    expect(close).not.toHaveBeenCalled()

    await user.click(dialog.getByRole('button', { name: 'Close booking' }))

    await waitFor(() => expect(close).toHaveBeenCalledWith('BK-10001'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('leaves the booking open when the close is not confirmed', async () => {
    payments.mockResolvedValue({ ...UNPAID, actions: { ...BACK, close: { allowed: true } } })
    const user = renderAction()

    await user.click(await screen.findByRole('button', { name: 'Close booking' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Back' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(close).not.toHaveBeenCalled()
  })
})
