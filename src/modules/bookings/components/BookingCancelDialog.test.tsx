import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { CancellationQuote } from '@/modules/payments/types/booking-payment.types'
import { useOrganizationStore } from '@/state/organization.store'
import type { CancelInput } from '../types/booking.types'
import { BookingCancelDialog } from './BookingCancelDialog'

const quote = vi.fn<() => Promise<CancellationQuote>>()

vi.mock('@/modules/payments/api/booking-payment.api', () => ({
  bookingPaymentApi: { cancellationQuote: () => quote() },
}))

/** Paid in full, a week and a half out, under the standard policy: half comes back. */
const HALF: CancellationQuote = {
  cancel: { allowed: true },
  currency: 'USD',
  paid: 235.4,
  paidByHand: 0,
  policy: [
    { daysBefore: 14, refundPercent: 100 },
    { daysBefore: 7, refundPercent: 50 },
  ],
  refundPercent: 50,
  policyRefund: 117.7,
  depositHeld: 0,
  withdrawsLink: false,
  emailsRenter: true,
}
const NO_POLICY: CancellationQuote = {
  ...HALF,
  policy: undefined,
  refundPercent: undefined,
  policyRefund: undefined,
}

function setOrganization() {
  useOrganizationStore.setState({
    membership: {
      organizationId: 't1',
      organizationName: 'Sunstate Car Co.',
      subdomain: 'sunstate',
      currency: 'USD',
      role: 'staff',
      permissions: [],
    },
  })
}

function renderDialog(onCancel = vi.fn<(input: CancelInput) => void>()) {
  setOrganization()
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BookingCancelDialog
        open
        cancellable
        onOpenChange={vi.fn()}
        reference="BK-10001"
        renterName="Marisol Vega"
        loading={false}
        onCancel={onCancel}
      />
    </QueryClientProvider>,
  )
  return { onCancel, user: userEvent.setup({ delay: null }) }
}

/** The refund answers, once the quote is in. */
const refunds = async () => within(await screen.findByRole('radiogroup', { name: 'Refund' }))
const reason = (name: string) =>
  within(screen.getByRole('radiogroup', { name: 'Reason' })).getByRole('radio', { name })
const confirm = () => screen.getByRole('button', { name: 'Cancel booking' })

afterEach(() => {
  quote.mockReset()
  useOrganizationStore.setState({ membership: null })
})

describe('BookingCancelDialog', () => {
  it('opens with the form already there, having read the quote while it was closed', async () => {
    quote.mockResolvedValue(HALF)
    setOrganization()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const dialog = (open: boolean) => (
      <QueryClientProvider client={client}>
        <BookingCancelDialog
          open={open}
          cancellable
          onOpenChange={vi.fn()}
          reference="BK-10001"
          renterName="Marisol Vega"
          loading={false}
          onCancel={vi.fn()}
        />
      </QueryClientProvider>
    )
    const { rerender } = render(dialog(false))
    await waitFor(() => expect(quote).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(client.isFetching()).toBe(0))

    rerender(dialog(true))

    // No spinner first: swapping it for the form is what made the dialog jump as it opened.
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Refund' })).toBeInTheDocument()
    // Still read again as it opens: the policy's answer depends on the hour.
    await waitFor(() => expect(quote).toHaveBeenCalledTimes(2))
  })

  it('does not cancel on the earlier quote while the one read on opening is still on its way', async () => {
    // A payment landed after the page loaded: the quote read while closed is short of it.
    quote.mockResolvedValueOnce({ ...NO_POLICY, paid: 100 })
    let answer: (fresh: CancellationQuote) => void = () => {}
    quote.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)))
    setOrganization()
    const onCancel = vi.fn<(input: CancelInput) => void>()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const dialog = (open: boolean) => (
      <QueryClientProvider client={client}>
        <BookingCancelDialog
          open={open}
          cancellable
          onOpenChange={vi.fn()}
          reference="BK-10001"
          renterName="Marisol Vega"
          loading={false}
          onCancel={onCancel}
        />
      </QueryClientProvider>
    )
    const user = userEvent.setup({ delay: null })
    const { rerender } = render(dialog(false))
    await waitFor(() => expect(client.isFetching()).toBe(0))
    rerender(dialog(true))
    await user.click((await refunds()).getByRole('radio', { name: /No refund/ }))
    await user.click(reason('Renter did not show up'))

    // Keeping "everything" off the old figure would have the API refund the new payment.
    expect(confirm()).toBeDisabled()
    await user.click(confirm())
    expect(onCancel).not.toHaveBeenCalled()

    await act(async () => answer({ ...NO_POLICY, paid: 235.4 }))
    await waitFor(() => expect(confirm()).toBeEnabled())
    await user.click(confirm())

    expect(onCancel).toHaveBeenCalledWith(expect.objectContaining({ reason: 'no_show', keep: 235.4 }))
  })

  it('reads nothing for a booking that cannot be cancelled', async () => {
    quote.mockResolvedValue(HALF)
    render(
      <QueryClientProvider client={new QueryClient()}>
        <BookingCancelDialog
          open={false}
          cancellable={false}
          onOpenChange={vi.fn()}
          reference="BK-10001"
          renterName="Marisol Vega"
          loading={false}
          onCancel={vi.fn()}
        />
      </QueryClientProvider>,
    )

    await Promise.resolve()
    expect(quote).not.toHaveBeenCalled()
  })

  it("starts on what the booking's policy gives back now, and marks it as suggested", async () => {
    quote.mockResolvedValue(HALF)
    const { onCancel, user } = renderDialog()

    const policy = (await refunds()).getByRole('radio', { name: /Per policy · 50%/ })
    expect(policy).toBeChecked()
    // Each answer carries its amount, and only the policy's own is the suggested one.
    expect(policy.closest('label')).toHaveTextContent('Suggested')
    expect(policy.closest('label')).toHaveTextContent('$117.70')
    expect(screen.getAllByText('Suggested')).toHaveLength(1)
    await user.click(reason('Renter asked to cancel'))
    await user.click(confirm())

    expect(onCancel).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'renter_request', message: '', keep: 117.7 }),
    )
  })

  it('moves to a full refund when the company is the one that cannot go through with it', async () => {
    quote.mockResolvedValue(HALF)
    const { onCancel, user } = renderDialog()
    const options = await refunds()

    await user.click(reason("We can't provide the vehicle"))

    const full = options.getByRole('radio', { name: /Full refund/ })
    expect(full).toBeChecked()
    expect(full.closest('label')).toHaveTextContent('Suggested')
    await user.click(confirm())
    expect(onCancel).toHaveBeenCalledWith(expect.objectContaining({ reason: 'vehicle_unavailable', keep: 0 }))
  })

  it('keeps an answer the counter picked, whatever reason is chosen after', async () => {
    quote.mockResolvedValue(HALF)
    const { onCancel, user } = renderDialog()
    const options = await refunds()

    await user.click(options.getByRole('radio', { name: /No refund/ }))
    await user.click(reason("We can't provide the vehicle"))
    await user.click(confirm())

    expect(options.getByRole('radio', { name: /No refund/ })).toBeChecked()
    expect(onCancel).toHaveBeenCalledWith(expect.objectContaining({ keep: 235.4 }))
  })

  it('takes another amount, and sends the message as it was typed', async () => {
    quote.mockResolvedValue(HALF)
    const { onCancel, user } = renderDialog()
    const options = await refunds()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()

    await user.click(options.getByRole('radio', { name: 'Other amount' }))
    await user.type(screen.getByRole('spinbutton', { name: 'Amount to refund' }), '200')
    await user.click(reason('Other'))
    await user.type(screen.getByRole('textbox', { name: /Message to the renter/ }), ' Sorry about this. ')
    await user.click(confirm())

    // 235.4 - 200 in floating point is 35.400000000000006.
    expect(onCancel).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'other', keep: 35.4, message: ' Sorry about this. ' }),
    )
  })

  it('puts the three answers on one line, and the amount under them only for Other amount', async () => {
    quote.mockResolvedValue(NO_POLICY)
    const { user } = renderDialog()
    const group = await screen.findByRole('radiogroup', { name: 'Refund' })
    const options = within(group)

    expect(options.getAllByRole('radio')).toHaveLength(3)
    expect(group).toHaveClass('sm:grid-cols-3')
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()

    await user.click(options.getByRole('radio', { name: 'Other amount' }))

    // Under the answers, not inside one of them, with its limit said beside it.
    const amount = screen.getByRole('spinbutton', { name: 'Amount to refund' })
    expect(group).not.toContainElement(amount)
    expect(screen.getByText('Up to $235.40.')).toBeInTheDocument()

    await user.click(options.getByRole('radio', { name: /No refund/ }))
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('does not badge the suggested answer when three share a line', async () => {
    quote.mockResolvedValue(NO_POLICY)
    const { user } = renderDialog()
    const options = await refunds()

    await user.click(reason("We can't provide the vehicle"))

    // Still the one selected for a cancellation that is the company's doing; it just carries
    // no badge, which had no room beside the label and pushed the answer to three lines.
    expect(options.getByRole('radio', { name: /Full refund/ })).toBeChecked()
    expect(screen.queryByText('Suggested')).not.toBeInTheDocument()
  })

  it('keeps four answers two to a line, where three across would not leave them room', async () => {
    quote.mockResolvedValue(HALF)
    renderDialog()
    const group = await screen.findByRole('radiogroup', { name: 'Refund' })

    expect(within(group).getAllByRole('radio')).toHaveLength(4)
    expect(group).toHaveClass('sm:grid-cols-2')
  })

  it('leaves a typed amount unused when a ready-made answer is picked after it', async () => {
    quote.mockResolvedValue(NO_POLICY)
    const { onCancel, user } = renderDialog()
    const options = await refunds()

    await user.click(options.getByRole('radio', { name: 'Other amount' }))
    await user.type(screen.getByRole('spinbutton', { name: 'Amount to refund' }), '200')
    await user.click(options.getByRole('radio', { name: /No refund/ }))
    await user.click(reason('Other'))
    await user.click(confirm())

    expect(onCancel).toHaveBeenCalledWith(expect.objectContaining({ keep: 235.4 }))
  })

  it('sends nothing without a reason, or for an amount it cannot refund', async () => {
    quote.mockResolvedValue(HALF)
    const { onCancel, user } = renderDialog()
    const options = await refunds()

    await user.click(confirm())
    expect(screen.getByText('Choose a reason.')).toBeInTheDocument()

    await user.click(reason('Other'))
    await user.click(options.getByRole('radio', { name: 'Other amount' }))
    await user.click(confirm())
    expect(screen.getByText('Enter the amount to refund.')).toBeInTheDocument()

    await user.type(screen.getByRole('spinbutton', { name: 'Amount to refund' }), '235.41')
    await user.click(confirm())
    expect(screen.getByText('That is more than was paid.')).toBeInTheDocument()
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('says everything else the cancellation undoes before it is confirmed', async () => {
    quote.mockResolvedValue({ ...HALF, paidByHand: 200, depositHeld: 350, withdrawsLink: true })
    const { user } = renderDialog()

    await user.click((await refunds()).getByRole('radio', { name: /Full refund/ }))

    const effects = within(screen.getByRole('list', { name: 'What cancelling does' }))
    for (const said of [
      // The card first: only what it cannot cover is cash to hand back.
      '$35.40 goes back to the card the renter paid with.',
      '$200 was paid in person. Hand it back yourself; it is recorded as refunded.',
      'The $350 deposit hold is released.',
      'The payment link already sent stops working.',
      'Marisol Vega is emailed that the booking is cancelled, with the reason.',
    ]) {
      expect(effects.getByText(said)).toBeInTheDocument()
    }
    expect(effects.queryByText(/is kept/)).not.toBeInTheDocument()
  })

  it('says nothing about the money while the amount to refund is still to be typed', async () => {
    quote.mockResolvedValue({ ...HALF, depositHeld: 350 })
    const { user } = renderDialog()

    await user.click((await refunds()).getByRole('radio', { name: 'Other amount' }))

    // An empty field is not a decision to keep it all, so no line may read as one.
    const effects = within(screen.getByRole('list', { name: 'What cancelling does' }))
    expect(effects.queryByText(/is kept|goes back/)).not.toBeInTheDocument()
    expect(effects.getByText('The $350 deposit hold is released.')).toBeInTheDocument()

    await user.type(screen.getByRole('spinbutton', { name: 'Amount to refund' }), '200')
    expect(effects.getByText('$35.40 is kept.')).toBeInTheDocument()
  })

  it('does not promise an email the API will not send', async () => {
    quote.mockResolvedValue({ ...HALF, emailsRenter: false })
    renderDialog()
    await refunds()

    const effects = within(screen.getByRole('list', { name: 'What cancelling does' }))
    expect(effects.getByText(/Email isn't set up, so Marisol Vega won't be told/)).toBeInTheDocument()
    expect(effects.queryByText(/is emailed/)).not.toBeInTheDocument()
    expect(screen.getByText(/Kept on the booking; email isn't set up, so it is not sent/)).toBeInTheDocument()
  })

  it('asks for no amount when nothing was paid, and keeps nothing', async () => {
    quote.mockResolvedValue({ ...NO_POLICY, paid: 0 })
    const { onCancel, user } = renderDialog()

    expect(await screen.findByText(/Nothing has been paid on this booking/)).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup', { name: 'Refund' })).not.toBeInTheDocument()
    await user.click(reason('Renter did not show up'))
    await user.click(confirm())

    expect(onCancel).toHaveBeenCalledWith(expect.objectContaining({ reason: 'no_show', keep: 0 }))
  })

  it('starts on a full refund, suggesting nothing, for a booking made under no policy', async () => {
    quote.mockResolvedValue(NO_POLICY)
    renderDialog()
    const options = await refunds()

    expect(options.getByRole('radio', { name: /Full refund/ })).toBeChecked()
    expect(screen.getByText(/has no cancellation policy/)).toBeInTheDocument()
    // Nothing stands behind the default here, so it is not dressed up as a recommendation.
    expect(screen.queryByText('Suggested')).not.toBeInTheDocument()
    expect(options.queryByRole('radio', { name: /Per policy/ })).not.toBeInTheDocument()
  })

  it('offers no way to cancel a booking the API says cannot be, and says why', async () => {
    quote.mockResolvedValue({ ...HALF, cancel: { allowed: false, reason: 'vehicle_out' } })
    renderDialog()

    expect(await screen.findByText('The vehicle is out: take it back to end the rental.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument()
  })
})
