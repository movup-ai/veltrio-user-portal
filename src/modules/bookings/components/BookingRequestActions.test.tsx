import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { ApiError } from '@/types/api'
import { BookingRequestActions } from './BookingRequestActions'

const confirm = vi.fn<(reference: string) => Promise<unknown>>()
const decline = vi.fn<(reference: string, input: unknown) => Promise<unknown>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))

const payments = vi.fn<() => Promise<{ openLink: boolean; depositRequested: boolean }>>()

vi.mock('@/modules/payments/api/booking-payment.api', () => ({
  bookingPaymentApi: { get: () => payments() },
}))

vi.mock('../api/booking.api', () => ({
  bookingApi: {
    confirm: (reference: string) => confirm(reference),
    decline: (reference: string, input: unknown) => decline(reference, input),
  },
}))

function renderActions() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  render(
    <QueryClientProvider client={client}>
      <BookingRequestActions reference="BK-10001" renterName="Marisol Vega" />
    </QueryClientProvider>,
  )
  return { invalidate, user: userEvent.setup({ delay: null }) }
}

/** The query keys a mutation asked to be refetched. */
function refreshed(invalidate: ReturnType<typeof renderActions>['invalidate']) {
  return invalidate.mock.calls.map(([filters]) => filters?.queryKey)
}

describe('BookingRequestActions', () => {
  beforeEach(() => {
    confirm.mockReset()
    decline.mockReset()
    payments.mockReset().mockResolvedValue({ openLink: false, depositRequested: false })
    vi.mocked(toast).mockReset()
  })

  it('warns that a payment link already sent stops working, only when one is out', async () => {
    const warning = 'The payment link already sent to them will stop working.'
    payments.mockResolvedValue({ openLink: true, depositRequested: false })
    const { user } = renderActions()

    await user.click(screen.getByRole('button', { name: 'Decline' }))

    // Declining withdraws the link, so the counter is told before the renter finds out.
    expect(await screen.findByText(warning, { exact: false })).toBeInTheDocument()
  })

  it('opens with no reason chosen and none focused, so nothing reads as preselected', async () => {
    const { user } = renderActions()

    await user.click(screen.getByRole('button', { name: 'Decline' }))

    // Focus goes to the dialog: on the first option it drew a ring that looked like a choice.
    expect(await screen.findByRole('dialog')).toHaveFocus()
    const reasons = screen.getAllByRole('radio')
    expect(reasons).toHaveLength(4)
    for (const reason of reasons) expect(reason).not.toBeChecked()
  })

  it('says nothing about a payment link when none was sent', async () => {
    const { user } = renderActions()

    await user.click(screen.getByRole('button', { name: 'Decline' }))

    expect(await screen.findByText(/BK-10001 for Marisol Vega/)).toBeInTheDocument()
    expect(screen.queryByText(/payment link/)).not.toBeInTheDocument()
  })

  it('confirms on one click and refreshes the booking and its payment card', async () => {
    confirm.mockResolvedValue({})
    const { invalidate, user } = renderActions()

    await user.click(screen.getByRole('button', { name: 'Confirm reservation' }))

    await waitFor(() => expect(confirm).toHaveBeenCalledWith('BK-10001'))
    await waitFor(() =>
      expect(refreshed(invalidate)).toEqual(
        expect.arrayContaining([['bookings'], ['booking-payments', 'BK-10001']]),
      ),
    )
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }))
  })

  it('declines only once a reason is picked, and sends it with the message', async () => {
    decline.mockResolvedValue({ booking: {}, renterNotified: true })
    const { invalidate, user } = renderActions()

    await user.click(screen.getByRole('button', { name: 'Decline' }))
    // Declining cancels the request for good, so the first click must not be the one that does it.
    expect(decline).not.toHaveBeenCalled()
    expect(await screen.findByText(/BK-10001 for Marisol Vega/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Decline reservation' }))
    // The renter is told why, so there has to be a why.
    expect(await screen.findByText('Choose a reason.')).toBeInTheDocument()
    expect(decline).not.toHaveBeenCalled()

    await user.click(screen.getByRole('radio', { name: 'Dates no longer available' }))
    await user.type(screen.getByRole('textbox', { name: /Message/ }), 'Free again from the 20th.')
    await user.click(screen.getByRole('button', { name: 'Decline reservation' }))

    await waitFor(() =>
      expect(decline).toHaveBeenCalledWith('BK-10001', {
        reason: 'dates_unavailable',
        message: 'Free again from the 20th.',
      }),
    )
    // A cancelled booking switches the agreement card's buttons off, so it is refetched too.
    await waitFor(() =>
      expect(refreshed(invalidate)).toEqual(expect.arrayContaining([['booking-contract', 'BK-10001']])),
    )
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success', description: 'Marisol Vega has been emailed the reason.' }),
    )
    expect(confirm).not.toHaveBeenCalled()
  })

  it('warns that the renter was not told when the API could not email them', async () => {
    decline.mockResolvedValue({ booking: {}, renterNotified: false })
    const { user } = renderActions()

    await user.click(screen.getByRole('button', { name: 'Decline' }))
    await user.click(await screen.findByRole('radio', { name: 'Other' }))
    await user.click(screen.getByRole('button', { name: 'Decline reservation' }))

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Email isn't set up, so Marisol Vega was not told. Message them yourself.",
        }),
      ),
    )
  })

  it('says why and reloads the booking when someone else has already answered it', async () => {
    confirm.mockRejectedValue(
      new ApiError('conflict', 'The booking is not waiting to be accepted', { status: 409, code: 'not_pending' }),
    )
    const { invalidate, user } = renderActions()

    await user.click(screen.getByRole('button', { name: 'Confirm reservation' }))

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'error',
          description: 'The booking is not waiting to be accepted',
        }),
      ),
    )
    expect(refreshed(invalidate)).toContainEqual(['bookings'])
  })
})
