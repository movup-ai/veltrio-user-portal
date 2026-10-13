import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { VEHICLES_SEED } from '@/modules/vehicles/mock/vehicle.mock'
import type { Vehicle } from '@/modules/vehicles/types/vehicle.types'
import { vehicleDisplayName } from '@/modules/vehicles/utils/vehicle.utils'
import { ApiError } from '@/types/api'
import type { BookedInterval, ChangeQuote, ChangeRequest } from '../types/booking.types'
import { BookingSwapDialog } from './BookingSwapDialog'

const quoteChange = vi.fn<(reference: string, request: ChangeRequest) => Promise<ChangeQuote>>()
const change = vi.fn<(reference: string, request: ChangeRequest, total: number) => Promise<unknown>>()
const schedule = vi.fn<() => Promise<BookedInterval[]>>()
const fleet = vi.fn<() => Promise<Vehicle[]>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))
vi.mock('../api/booking.api', () => ({
  bookingApi: {
    quoteChange: (reference: string, request: ChangeRequest) => quoteChange(reference, request),
    change: (reference: string, request: ChangeRequest, total: number) => change(reference, request, total),
    schedule: () => schedule(),
  },
}))
vi.mock('@/modules/vehicles/api/vehicle.api', () => ({ vehicleApi: { listAll: () => fleet() } }))

const [OWN, OTHER, TAKEN] = VEHICLES_SEED
const PICKUP = '2026-10-20T14:00:00.000Z'
const RETURN = '2026-10-24T14:00:00.000Z'
const BOOKING = {
  reference: 'BK-10001',
  vehicleId: OWN.id,
  pickupAt: PICKUP,
  returnAt: RETURN,
  pickupLocation: OWN.location,
  total: 235.4,
}

function quoted(overrides: Partial<ChangeQuote> = {}): ChangeQuote {
  return {
    pickupAt: PICKUP,
    returnAt: RETURN,
    vehicleId: OTHER.id,
    vehicleName: vehicleDisplayName(OTHER),
    vehiclePlate: OTHER.plate,
    previousTotal: 235.4,
    total: 342.4,
    lines: [{ optionId: 'o1', label: 'Daily', basis: 'day', rate: 80, count: 4 }],
    previousDeposit: 350,
    deposit: 200,
    balance: 342.4,
    overpaid: 0,
    voidsAgreement: false,
    withdrawsLink: false,
    releasesDeposit: false,
    emailsRenter: true,
    ...overrides,
  }
}

function renderDialog() {
  const onOpenChange = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BookingSwapDialog open onOpenChange={onOpenChange} booking={BOOKING} renterName="Marisol Vega" />
    </QueryClientProvider>,
  )
  return { onOpenChange }
}

/** Opens the vehicle field, as the counter would, and finds a car in its list by plate. */
async function row(vehicle: Vehicle) {
  const field = await screen.findByRole('combobox', { name: 'New vehicle' })
  if (field.getAttribute('aria-expanded') !== 'true') await userEvent.setup({ delay: null }).click(field)
  return screen.findByRole('option', { name: new RegExp(vehicle.plate) })
}

afterEach(() => {
  for (const mock of [quoteChange, change, schedule, fleet]) mock.mockReset()
})

describe('BookingSwapDialog', () => {
  it('offers every car but the booking’s own, with one taken on its dates out of reach', async () => {
    fleet.mockResolvedValue([OWN, OTHER, TAKEN])
    schedule.mockResolvedValue([
      // Its own dates on its own car, which is not in the list to clash with.
      { reference: 'BK-10001', vehicleId: OWN.id, plate: OWN.plate, from: PICKUP, to: RETURN },
      { reference: 'BK-10002', vehicleId: TAKEN.id, plate: TAKEN.plate, from: PICKUP, to: RETURN },
    ])
    renderDialog()

    expect(await row(OTHER)).toBeEnabled()
    expect(await row(TAKEN)).toBeDisabled()
    expect(screen.getAllByRole('option')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Swap vehicle' })).toBeDisabled()
    expect(quoteChange).not.toHaveBeenCalled()
  })

  it('goes by the booking’s dates, not by where each car is today', async () => {
    // Out now and back before the rental starts, so the API holds nothing against it.
    const backByThen: Vehicle = { ...OTHER, status: 'On rent' }
    // Due back days ago and still out: listed as held, though its own dates miss the window.
    const late: Vehicle = { ...TAKEN, status: 'On rent' }
    const inService: Vehicle = { ...VEHICLES_SEED[3], status: 'Maintenance' }
    fleet.mockResolvedValue([OWN, backByThen, late, inService])
    schedule.mockResolvedValue([
      {
        reference: 'BK-10003',
        vehicleId: late.id,
        plate: late.plate,
        from: '2026-10-10T14:00:00.000Z',
        to: '2026-10-14T14:00:00.000Z',
      },
    ])
    renderDialog()

    expect(await row(backByThen)).toBeEnabled()
    const held = await row(late)
    expect(held).toBeDisabled()
    expect(held).toHaveTextContent('Out on BK-10003')
    // No telling when a car in the workshop is back, so it is not offered at all.
    expect(screen.getAllByRole('option')).toHaveLength(2)
  })

  it('prices the car picked at its own rates, and swaps at the figure it showed', async () => {
    fleet.mockResolvedValue([OWN, OTHER])
    schedule.mockResolvedValue([])
    quoteChange.mockResolvedValue(quoted())
    change.mockResolvedValue({ emailQueued: true, agreementVoided: false, depositReleased: false })
    const user = userEvent.setup({ delay: null })
    const { onOpenChange } = renderDialog()

    await user.click(await row(OTHER))

    const request = { vehicleId: OTHER.id, keepPrice: false }
    await waitFor(() => expect(quoteChange).toHaveBeenCalledWith('BK-10001', request))
    expect(await screen.findAllByText('$342.40')).toHaveLength(2)
    // The deposit is the car's, so the swap says what it becomes.
    expect(screen.getByText('$350 → $200')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Swap vehicle' }))

    await waitFor(() => expect(change).toHaveBeenCalledWith('BK-10001', request, 342.4))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('prices it again at the booking’s own price when asked to keep it', async () => {
    fleet.mockResolvedValue([OWN, OTHER])
    schedule.mockResolvedValue([])
    quoteChange.mockImplementation((_reference, request) =>
      Promise.resolve(request.keepPrice ? quoted({ total: 235.4, balance: 235.4 }) : quoted()),
    )
    change.mockResolvedValue({ emailQueued: true, agreementVoided: false, depositReleased: false })
    const user = userEvent.setup({ delay: null })
    renderDialog()

    await user.click(await row(OTHER))
    await screen.findAllByText('$342.40')
    await user.click(screen.getByRole('switch', { name: /Keep the current price/ }))

    expect(await screen.findByText('Current price kept')).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByText('$235.40')).toHaveLength(3))
    await user.click(screen.getByRole('button', { name: 'Swap vehicle' }))

    await waitFor(() =>
      expect(change).toHaveBeenCalledWith('BK-10001', { vehicleId: OTHER.id, keepPrice: true }, 235.4),
    )
  })

  it('says why a car cannot be swapped in, and offers nothing to confirm', async () => {
    fleet.mockResolvedValue([OWN, OTHER])
    schedule.mockResolvedValue([])
    quoteChange.mockRejectedValue(
      new ApiError('conflict', 'BK-10002 has this vehicle', { status: 409, code: 'vehicle_unavailable' }),
    )
    const user = userEvent.setup({ delay: null })
    renderDialog()

    await user.click(await row(OTHER))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Another booking has this vehicle on those dates.',
    )
    expect(screen.getByRole('button', { name: 'Swap vehicle' })).toBeDisabled()
    // The rows stay, without figures: taking them away would make the dialog jump.
    expect(screen.getByText('New total').nextElementSibling).toHaveTextContent('—')
  })

  it('has the price rows up before a car is picked, so picking one does not resize it', async () => {
    fleet.mockResolvedValue([OWN, OTHER])
    schedule.mockResolvedValue([])
    renderDialog()

    expect((await screen.findByText('Current total')).nextElementSibling).toHaveTextContent('$235.40')
    expect(screen.getByText('New total').nextElementSibling).toHaveTextContent('—')
    expect(quoteChange).not.toHaveBeenCalled()
  })

  it('says so when the fleet has no other car', async () => {
    fleet.mockResolvedValue([OWN])
    schedule.mockResolvedValue([])
    renderDialog()

    expect(await screen.findByText('No other vehicle to swap to')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Swap vehicle' })).not.toBeInTheDocument()
  })
})
