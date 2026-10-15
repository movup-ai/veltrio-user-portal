import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { ApiError } from '@/types/api'
import type { AdditionalDriver, ChangeQuote, ChangeRequest } from '../types/booking.types'
import { BookingDriversDialog } from './BookingDriversDialog'

const quoteChange = vi.fn<(reference: string, request: ChangeRequest) => Promise<ChangeQuote>>()
const change = vi.fn<(reference: string, request: ChangeRequest, total: number) => Promise<unknown>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))
vi.mock('../api/booking.api', () => ({
  bookingApi: {
    quoteChange: (reference: string, request: ChangeRequest) => quoteChange(reference, request),
    change: (reference: string, request: ChangeRequest, total: number) => change(reference, request, total),
  },
}))

const SAM: AdditionalDriver = {
  id: 'd1',
  name: 'Sam Okafor',
  licenceNumber: 'FL 9911',
  licenceState: '',
  licenceExpiry: '',
  pricePerDay: 12,
}
const DANA: AdditionalDriver = {
  id: 'd2',
  name: 'Dana Ortiz',
  licenceNumber: 'FL 2204',
  licenceState: '',
  licenceExpiry: '',
  pricePerDay: 12,
}

function quoted(overrides: Partial<ChangeQuote> = {}): ChangeQuote {
  return {
    pickupAt: '2026-10-20T14:00:00.000Z',
    returnAt: '2026-10-24T14:00:00.000Z',
    vehicleId: 'v1',
    vehicleName: 'Toyota Camry',
    vehiclePlate: 'ABC1234',
    previousTotal: 235.4,
    total: 286.76,
    lines: [{ optionId: 'o1', label: 'Daily', basis: 'day', rate: 55, count: 4 }],
    previousDeposit: 350,
    deposit: 350,
    balance: 286.76,
    overpaid: 0,
    voidsAgreement: false,
    withdrawsLink: false,
    releasesDeposit: false,
    emailsRenter: true,
    ...overrides,
  }
}

function renderDialog(drivers: AdditionalDriver[] = []) {
  const onOpenChange = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BookingDriversDialog
        open
        onOpenChange={onOpenChange}
        booking={{ reference: 'BK-10001', additionalDrivers: drivers, total: 235.4 }}
        renterName="Marisol Vega"
      />
    </QueryClientProvider>,
  )
  return { onOpenChange }
}

const figure = (label: string) => screen.getByText(label).nextElementSibling

afterEach(() => {
  for (const mock of [quoteChange, change]) mock.mockReset()
})

describe('BookingDriversDialog', () => {
  it('opens on a driver to fill in when the booking has none, with nothing to price or save', () => {
    renderDialog()

    expect(screen.getByRole('textbox', { name: 'Driver 1 full name' })).toHaveValue('')
    expect(figure('Current total')).toHaveTextContent('$235.40')
    expect(figure('New total')).toHaveTextContent('—')
    expect(screen.getByRole('button', { name: 'Save drivers' })).toBeDisabled()
    expect(quoteChange).not.toHaveBeenCalled()
  })

  it('prices a driver once they have a name and a licence, and saves at the figure shown', async () => {
    quoteChange.mockResolvedValue(quoted())
    change.mockResolvedValue({ emailQueued: true, agreementVoided: false, depositReleased: false })
    const user = userEvent.setup({ delay: null })
    const { onOpenChange } = renderDialog()

    await user.type(screen.getByRole('textbox', { name: 'Driver 1 full name' }), 'Sam Okafor')
    // A name alone is not a driver the agreement can state.
    expect(quoteChange).not.toHaveBeenCalled()
    await user.type(screen.getByRole('textbox', { name: 'Driver 1 licence number' }), 'FL 9911')

    await waitFor(() => expect(quoteChange).toHaveBeenCalled())
    const [, request] = quoteChange.mock.calls.at(-1) ?? []
    expect(request?.additionalDrivers).toMatchObject([
      { name: 'Sam Okafor', licenceNumber: 'FL 9911', licenceState: '', licenceExpiry: '', pricePerDay: 12 },
    ])
    expect(await screen.findAllByText('$286.76')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Save drivers' }))

    await waitFor(() => expect(change).toHaveBeenCalledWith('BK-10001', request, 286.76))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('lists the drivers the booking has, and takes one off', async () => {
    quoteChange.mockResolvedValue(quoted({ previousTotal: 338.12, total: 286.76, balance: 286.76 }))
    const user = userEvent.setup({ delay: null })
    renderDialog([SAM, DANA])

    expect(screen.getByRole('textbox', { name: 'Driver 1 full name' })).toHaveValue('Sam Okafor')
    expect(screen.getByRole('textbox', { name: 'Driver 2 full name' })).toHaveValue('Dana Ortiz')
    // As they are, there is nothing to save.
    expect(screen.getByRole('button', { name: 'Save drivers' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Remove driver 1' }))

    await waitFor(() => expect(quoteChange).toHaveBeenCalledWith('BK-10001', { additionalDrivers: [DANA] }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save drivers' })).toBeEnabled())
  })

  it('asks for the whole list to be empty when the last driver is taken off', async () => {
    quoteChange.mockResolvedValue(quoted({ previousTotal: 286.76, total: 235.4, balance: 235.4 }))
    const user = userEvent.setup({ delay: null })
    renderDialog([SAM])

    await user.click(screen.getByRole('button', { name: 'Remove driver 1' }))

    await waitFor(() => expect(quoteChange).toHaveBeenCalledWith('BK-10001', { additionalDrivers: [] }))
  })

  it('says what was wrong when the change is refused, and stays open', async () => {
    quoteChange.mockResolvedValue(quoted({ previousTotal: 286.76, total: 235.4, balance: 235.4 }))
    change.mockRejectedValue(
      new ApiError('conflict', 'The vehicle has been picked up', { status: 409, code: 'not_before_pickup' }),
    )
    const user = userEvent.setup({ delay: null })
    const { onOpenChange } = renderDialog([SAM])

    await user.click(screen.getByRole('button', { name: 'Remove driver 1' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save drivers' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Save drivers' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/vehicle has been picked up/)
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
