import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { ApiError } from '@/types/api'
import type { BookingExtensions, ExtensionQuote } from '../types/booking-extension.types'
import type { BookingPayments } from '../types/booking-payment.types'
import { ExtendRentalDialog } from './ExtendRentalDialog'

const quote = vi.fn<(reference: string, returnAt: string) => Promise<ExtensionQuote>>()
const request = vi.fn<(reference: string, returnAt: string, amount: number) => Promise<BookingExtensions>>()
const payments = vi.fn<() => Promise<BookingPayments>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))
vi.mock('../api/booking-extension.api', () => ({
  bookingExtensionApi: {
    quote: (reference: string, returnAt: string) => quote(reference, returnAt),
    request: (reference: string, returnAt: string, amount: number) => request(reference, returnAt, amount),
  },
}))
vi.mock('../api/booking-payment.api', () => ({ bookingPaymentApi: { get: () => payments() } }))

/** Local wall-clock times, so the dialog's day and hour read the same in any runner's zone. */
const at = (day: number, hour = 10) => new Date(2026, 9, day, hour)
const NOW = at(8)
const DUE = at(10).toISOString()
const SUGGESTED = at(11).toISOString()

const EXTENSIONS: BookingExtensions = { extend: { allowed: true }, history: [] }
const NO_DEPOSIT = { deposit: undefined } as unknown as BookingPayments

function quoted(overrides: Partial<ExtensionQuote> = {}): ExtensionQuote {
  return {
    returnAt: SUGGESTED,
    previousTotal: 235.4,
    total: 294.25,
    amount: 58.85,
    lines: [{ optionId: 'o1', label: 'Daily', basis: 'day', rate: 55, count: 5 }],
    payFirst: true,
    ...overrides,
  }
}

function renderDialog(props: Partial<Parameters<typeof ExtendRentalDialog>[0]> = {}) {
  const onRequested = vi.fn()
  const onOpenChange = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ExtendRentalDialog
        open
        onOpenChange={onOpenChange}
        reference="BK-10001"
        renterName="Marisol Vega"
        returnAt={DUE}
        pickedUp
        extensions={EXTENSIONS}
        onRequested={onRequested}
        {...props}
      />
    </QueryClientProvider>,
  )
  return { onRequested, onOpenChange }
}

beforeEach(() => {
  // Only the clock: timers stay real, or typing and the queries would never settle.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  payments.mockResolvedValue(NO_DEPOSIT)
})

afterEach(() => {
  vi.useRealTimers()
  for (const mock of [quote, request, payments]) mock.mockReset()
})

describe('ExtendRentalDialog', () => {
  it('prices a day more as it opens, and asks for it at the figure it showed', async () => {
    const made: BookingExtensions = { ...EXTENSIONS, extend: { allowed: false, reason: 'extension_pending' } }
    quote.mockResolvedValue(quoted())
    request.mockResolvedValue(made)
    const user = userEvent.setup({ delay: null })
    const { onRequested, onOpenChange } = renderDialog()

    expect(await screen.findByText('$58.85')).toBeInTheDocument()
    expect(quote).toHaveBeenCalledWith('BK-10001', SUGGESTED)
    expect(screen.getByText('Daily × 5')).toBeInTheDocument()
    // The car is out, so the date only moves once the renter has paid.
    expect(screen.getByText(/moves once Marisol Vega has paid/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Request extension' }))

    await waitFor(() => expect(request).toHaveBeenCalledWith('BK-10001', SUGGESTED, 58.85))
    await waitFor(() => expect(onRequested).toHaveBeenCalledWith(made))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('says it takes effect at once before pickup, where pickup itself waits for the money', async () => {
    quote.mockResolvedValue(quoted({ payFirst: false }))
    renderDialog({ pickedUp: false })

    // Known before the price is: before pickup the note does not depend on it.
    expect(screen.getByText(/has to be signed again before pickup/)).toBeInTheDocument()
    await screen.findByText('$58.85')
    expect(screen.getByRole('button', { name: 'Extend rental' })).toBeEnabled()
  })

  it('shows why the API will not quote the time, and offers nothing to confirm', async () => {
    quote.mockRejectedValue(
      new ApiError('conflict', 'BK-10002 has this vehicle from 2026-10-11', {
        status: 409,
        code: 'vehicle_unavailable',
      }),
    )
    renderDialog()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Another booking has this vehicle before then.',
    )
    expect(screen.getByRole('button', { name: 'Request extension' })).toBeDisabled()
    // Nothing was priced, so there is no summary to stand beside the refusal.
    expect(screen.queryByText('To pay for the extension')).not.toBeInTheDocument()
  })

  it('does not ask for a time past the next booking', async () => {
    // The next booking starts the moment this one ends, so no later return fits.
    renderDialog({ extensions: { ...EXTENSIONS, availableUntil: DUE } })

    expect(await screen.findByRole('alert')).toHaveTextContent(/next booking takes this vehicle/)
    expect(quote).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Request extension' })).toBeDisabled()
  })

  it('warns when the deposit hold and the insurance end before the new return', async () => {
    quote.mockResolvedValue(quoted())
    payments.mockResolvedValue({
      deposit: { status: 'held', captureBefore: at(10, 18).toISOString() },
    } as unknown as BookingPayments)
    renderDialog({ coverValidUntil: '2026-10-10' })

    expect(await screen.findByText(/deposit hold lapses/)).toBeInTheDocument()
    expect(screen.getByText(/verified insurance runs out/)).toBeInTheDocument()
  })

  it('opens at its full height, with the rows waiting for the figures the quote brings', () => {
    // Never answers: the dialog as it stands the moment it opens.
    quote.mockReturnValue(new Promise(() => {}))
    renderDialog()

    for (const row of ['Rental total now', 'New rental total', 'To pay for the extension']) {
      expect(screen.getByText(row)).toBeInTheDocument()
    }
    // Worked out from the two times, so it needs no answer from the API.
    expect(screen.getByText('1 day')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Request extension' })).toBeDisabled()
  })

  it('shows a price that moved since the quote instead of closing', async () => {
    quote.mockResolvedValue(quoted())
    request.mockRejectedValue(
      new ApiError('conflict', 'The price has changed since it was quoted', {
        status: 409,
        code: 'quote_changed',
      }),
    )
    const user = userEvent.setup({ delay: null })
    const { onRequested, onOpenChange } = renderDialog()

    await screen.findByText('$58.85')
    await user.click(screen.getByRole('button', { name: 'Request extension' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/price changed while this was open/)
    expect(onRequested).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
