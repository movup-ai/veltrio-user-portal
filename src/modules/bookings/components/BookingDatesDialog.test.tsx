import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { ApiError } from '@/types/api'
import type { BookedInterval, ChangeQuote, ChangeRequest } from '../types/booking.types'
import { BookingDatesDialog } from './BookingDatesDialog'

const quoteChange = vi.fn<(reference: string, request: ChangeRequest) => Promise<ChangeQuote>>()
const change = vi.fn<(reference: string, request: ChangeRequest, total: number) => Promise<unknown>>()
const schedule = vi.fn<(from: string, to: string, vehicleId?: string) => Promise<BookedInterval[]>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))
vi.mock('../api/booking.api', () => ({
  bookingApi: {
    quoteChange: (reference: string, request: ChangeRequest) => quoteChange(reference, request),
    change: (reference: string, request: ChangeRequest, total: number) => change(reference, request, total),
    schedule: (from: string, to: string, vehicleId?: string) => schedule(from, to, vehicleId),
  },
}))

/** Local wall-clock times, so the fields read the same in any runner's zone. */
const at = (day: number, hour = 10) => new Date(2026, 9, day, hour).toISOString()
const NOW = new Date(2026, 9, 13, 9)
const BOOKING = { reference: 'BK-10001', vehicleId: 'v1', pickupAt: at(20), returnAt: at(24), total: 235.4 }

function quoted(overrides: Partial<ChangeQuote> = {}): ChangeQuote {
  return {
    pickupAt: at(20),
    returnAt: at(24, 14),
    vehicleId: 'v1',
    vehicleName: 'Toyota Camry',
    vehiclePlate: 'ABC1234',
    previousTotal: 235.4,
    total: 294.25,
    lines: [{ optionId: 'o1', label: 'Daily', basis: 'day', rate: 55, count: 5 }],
    previousDeposit: 350,
    deposit: 350,
    balance: 294.25,
    overpaid: 0,
    voidsAgreement: false,
    withdrawsLink: false,
    releasesDeposit: false,
    emailsRenter: true,
    ...overrides,
  }
}

function renderDialog(booking = BOOKING) {
  const onOpenChange = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BookingDatesDialog open onOpenChange={onOpenChange} booking={booking} renterName="Marisol Vega" />
    </QueryClientProvider>,
  )
  return { onOpenChange }
}

/** Moves one end's time of day through its picker, as the counter would. */
async function pickTime(user: ReturnType<typeof userEvent.setup>, field: string, time: string) {
  await user.click(screen.getByRole('button', { name: field }))
  await user.click(await screen.findByRole('option', { name: time }))
}

beforeEach(() => {
  // Only the clock: timers stay real, or typing and the queries would never settle.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  schedule.mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
  for (const mock of [quoteChange, change, schedule]) mock.mockReset()
})

describe('BookingDatesDialog', () => {
  const figure = (label: string) => screen.getByText(label).nextElementSibling

  it('opens at its full height, with what the booking is now and nothing to price or save', () => {
    renderDialog()

    // The rows are there from the start: appearing on the first change, they made the dialog jump.
    expect(figure('Duration')).toHaveTextContent('4 days')
    expect(figure('Current total')).toHaveTextContent('$235.40')
    expect(figure('New total')).toHaveTextContent('—')
    expect(figure('Balance due')).toHaveTextContent('—')
    expect(screen.getByRole('button', { name: 'Save new dates' })).toBeDisabled()
    expect(quoteChange).not.toHaveBeenCalled()
  })

  it('says the new length at once, and holds the other figures steady while a price loads', async () => {
    // The first price answers, the second never does: the dialog as it stands in between.
    quoteChange.mockResolvedValueOnce(quoted()).mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup({ delay: null })
    renderDialog()

    await pickTime(user, 'Return time', '2:00 PM')
    expect(await screen.findAllByText('$294.25')).toHaveLength(2)
    await pickTime(user, 'Return time', '3:00 PM')

    expect(figure('Duration')).toHaveTextContent('4 days 5h')
    // The last price stays up, and dims only if the next is slow: at once, it read as a blink.
    const summary = screen.getByText('New total').closest('[aria-busy]')
    expect(summary).toHaveAttribute('aria-busy', 'true')
    expect(summary).toHaveClass('opacity-60', 'delay-300')
    expect(figure('New total')).toHaveTextContent('$294.25')
    expect(screen.getByRole('button', { name: 'Save new dates' })).toBeDisabled()
  })

  it('strikes out of the calendars the days another booking has the car', async () => {
    // Out from the 26th at 10:00 to the 29th at 10:00, after this booking's 20th to 24th.
    schedule.mockResolvedValue([
      { reference: 'BK-10001', vehicleId: 'v1', plate: 'ABC1234', from: at(20), to: at(24) },
      { reference: 'BK-10002', vehicleId: 'v1', plate: 'ABC1234', from: at(26), to: at(29) },
    ])
    const user = userEvent.setup({ delay: null })
    renderDialog()
    const day = (date: number) =>
      screen.getByRole('button', { name: new RegExp(`October ${date}(st|nd|rd|th)`) })

    // Read for this car alone, from today on: the whole fleet's bookings are not needed.
    await waitFor(() => expect(schedule).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'v1'))
    await user.click(screen.getByRole('button', { name: 'Pickup date' }))
    await waitFor(() => expect(day(27)).toBeDisabled())
    // Only days with no hour left: the car is free the morning it leaves, and once it is back.
    expect([day(22), day(26), day(29)].every((button) => !button.hasAttribute('disabled'))).toBe(true)
    expect(day(28)).toBeDisabled()
    await user.keyboard('{Escape}')

    await user.click(screen.getByRole('button', { name: 'Return date' }))
    // Up to the day the next rental begins, and not past it.
    expect(day(26)).toBeEnabled()
    expect(day(27)).toBeDisabled()
    expect(day(30)).toBeDisabled()
  })

  it('strikes out of a day’s times the hours the car is taken, and moves a taken hour to a free one', async () => {
    schedule.mockResolvedValue([
      { reference: 'BK-10002', vehicleId: 'v1', plate: 'ABC1234', from: at(26), to: at(29) },
    ])
    quoteChange.mockResolvedValue(quoted())
    const user = userEvent.setup({ delay: null })
    renderDialog()
    await waitFor(() => expect(schedule).toHaveBeenCalled())

    // The 26th, where the next rental begins at 10:00, with this one due back at 10:00 already.
    await user.click(screen.getByRole('button', { name: 'Return date' }))
    await user.click(await screen.findByRole('button', { name: /October 26th/ }))
    await user.click(screen.getByRole('button', { name: 'Return time' }))
    expect(screen.getByRole('option', { name: '10:00 AM' })).toBeEnabled()
    expect(screen.getByRole('option', { name: '10:30 AM' })).toBeDisabled()
    expect(screen.getByRole('option', { name: '9:00 AM' })).toBeEnabled()
    await user.keyboard('{Escape}')

    // Picked up the day the car comes back: 10:00 is the first free hour, so it stays.
    await user.click(screen.getByRole('button', { name: 'Pickup date' }))
    await user.click(await screen.findByRole('button', { name: /October 29th/ }))
    await user.click(screen.getByRole('button', { name: 'Pickup time' }))
    expect(screen.getByRole('option', { name: '9:30 AM' })).toBeDisabled()
    expect(screen.getByRole('option', { name: '10:00 AM' })).toHaveAttribute('aria-selected', 'true')
  })

  it('moves the time to a free hour when the day picked has the current one taken', async () => {
    // Back at 2:00 PM on the 28th: a 10:00 AM pickup that day is still inside it.
    schedule.mockResolvedValue([
      { reference: 'BK-10002', vehicleId: 'v1', plate: 'ABC1234', from: at(26), to: at(28, 14) },
    ])
    const user = userEvent.setup({ delay: null })
    renderDialog()
    await waitFor(() => expect(schedule).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: 'Pickup date' }))
    await user.click(await screen.findByRole('button', { name: /October 28th/ }))

    expect(screen.getByRole('button', { name: 'Pickup time' })).toHaveTextContent('2:00 PM')
  })

  it('prices the end that moved, and saves it at the figure it showed', async () => {
    quoteChange.mockResolvedValue(quoted())
    change.mockResolvedValue({ emailQueued: true, agreementVoided: false, depositReleased: false })
    const user = userEvent.setup({ delay: null })
    const { onOpenChange } = renderDialog()

    await pickTime(user, 'Return time', '2:00 PM')

    // The pickup stays out of the request: it did not move.
    await waitFor(() => expect(quoteChange).toHaveBeenCalledWith('BK-10001', { returnAt: at(24, 14) }))
    expect(await screen.findAllByText('$294.25')).toHaveLength(2)
    expect(screen.getByText('Daily × 5')).toBeInTheDocument()
    expect(screen.getByText('4 days 4h')).toBeInTheDocument()
    // Nothing is taken back and the renter is emailed as always, so there is no list to read.
    expect(screen.queryByRole('list', { name: 'What the change also does' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save new dates' }))

    await waitFor(() => expect(change).toHaveBeenCalledWith('BK-10001', { returnAt: at(24, 14) }, 294.25))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('says what a cheaper rental leaves to refund, and what the change takes back', async () => {
    quoteChange.mockResolvedValue(
      quoted({
        total: 176.55,
        balance: 0,
        overpaid: 58.85,
        voidsAgreement: true,
        withdrawsLink: true,
        releasesDeposit: true,
        emailsRenter: false,
      }),
    )
    const user = userEvent.setup({ delay: null })
    renderDialog()

    await pickTime(user, 'Return time', '2:00 PM')

    expect(await screen.findByText('To refund')).toBeInTheDocument()
    const effects = screen.getByRole('list', { name: 'What the change also does' })
    for (const said of [
      /agreement is voided/,
      /link already sent stops working/,
      /deposit hold is released/,
      /\$58\.85 is owed back to Marisol Vega/,
      /Marisol Vega won't be told/,
    ]) {
      expect(effects).toHaveTextContent(said)
    }
  })

  it('offers no return time at or before the pickup on the same day', async () => {
    const user = userEvent.setup({ delay: null })
    renderDialog({ ...BOOKING, returnAt: at(20, 14) })

    await user.click(screen.getByRole('button', { name: 'Return time' }))

    expect(screen.getByRole('option', { name: '9:00 AM' })).toBeDisabled()
    expect(screen.getByRole('option', { name: '10:00 AM' })).toBeDisabled()
    expect(screen.getByRole('option', { name: '10:30 AM' })).toBeEnabled()
  })

  it('does not ask the API for a pickup moved past the return', async () => {
    const user = userEvent.setup({ delay: null })
    renderDialog({ ...BOOKING, returnAt: at(20, 14) })

    await pickTime(user, 'Pickup time', '3:00 PM')

    expect(await screen.findByRole('alert')).toHaveTextContent('The return has to be after the pickup.')
    expect(quoteChange).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Save new dates' })).toBeDisabled()
  })

  it('names the booking in the way when the vehicle is taken on the new dates', async () => {
    quoteChange.mockRejectedValue(
      new ApiError('conflict', 'BK-10002 has this vehicle', { status: 409, code: 'vehicle_unavailable' }),
    )
    // Booked while the dialog was open: the calendars read before it, the refusal after.
    schedule.mockImplementation((_from, _to, vehicleId) =>
      Promise.resolve(
        vehicleId
          ? []
          : [
              { reference: 'BK-10001', vehicleId: 'v1', plate: 'ABC1234', from: at(20), to: at(24) },
              { reference: 'BK-10002', vehicleId: 'v1', plate: 'ABC1234', from: at(24, 12), to: at(27) },
            ],
      ),
    )
    const user = userEvent.setup({ delay: null })
    renderDialog()

    await pickTime(user, 'Return time', '2:00 PM')

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/BK-10002 has this vehicle from/))
    expect(screen.getByRole('button', { name: 'Save new dates' })).toBeDisabled()
    // The rows stay where they are, without figures: taking them away made the dialog jump.
    expect(figure('New total')).toHaveTextContent('—')
  })

  it('says the car is not back when a rental past its dates is what holds it', async () => {
    quoteChange.mockRejectedValue(
      new ApiError('conflict', 'BK-10003 has this vehicle', { status: 409, code: 'vehicle_unavailable' }),
    )
    // Listed for the new window though it was due on the 18th: the API knows it is still out.
    schedule.mockResolvedValue([
      { reference: 'BK-10003', vehicleId: 'v1', plate: 'ABC1234', from: at(15), to: at(18) },
    ])
    const user = userEvent.setup({ delay: null })
    renderDialog()

    await pickTime(user, 'Pickup time', '9:00 AM')

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/BK-10003 still has this vehicle out/),
    )
    expect(screen.getByRole('button', { name: 'Save new dates' })).toBeDisabled()
  })

  it('shows a price that moved since the quote, with the new figure to confirm', async () => {
    quoteChange.mockResolvedValueOnce(quoted()).mockResolvedValue(quoted({ total: 300, balance: 300 }))
    change.mockRejectedValue(
      new ApiError('conflict', 'The price has changed since it was quoted', {
        status: 409,
        code: 'quote_changed',
      }),
    )
    const user = userEvent.setup({ delay: null })
    const { onOpenChange } = renderDialog()

    await pickTime(user, 'Return time', '2:00 PM')
    await screen.findAllByText('$294.25')
    await user.click(screen.getByRole('button', { name: 'Save new dates' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/price changed while this was open/)
    expect(await screen.findAllByText('$300')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Save new dates' })).toBeEnabled()
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
