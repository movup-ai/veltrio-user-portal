import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { statusColors } from '@/components/data-display/status-colors'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CALENDAR_STATUSES } from '@/modules/bookings/types/booking-calendar.types'
import type { Booking } from '@/modules/bookings/types/booking.types'
import type { Vehicle } from '@/modules/vehicles/types/vehicle.types'
import { useOrganizationStore } from '@/state/organization.store'
import type { OrganizationMembership } from '@/types/user'

const calendar = vi.fn<(from: string, to: string) => Promise<Booking[]>>()

vi.mock('@/modules/bookings/api/booking.api', () => ({
  bookingApi: { calendar: (from: string, to: string) => calendar(from, to) },
}))
vi.mock('@/modules/vehicles/api/vehicle.api', () => ({
  vehicleApi: { listAll: () => Promise.resolve(FLEET) },
}))
vi.mock('@/modules/locations/api/location.api', () => ({
  locationApi: { list: () => Promise.resolve([]) },
}))

const { CalendarPage } = await import('./CalendarPage')

/** Local time, as the calendar draws it. */
const at = (day: number, hour = 0, month = 8) => new Date(2026, month, day, hour)

function vehicle(id: string, model: string, plate: string): Vehicle {
  return { id, make: 'Honda', model, plate, location: 'Miami', photos: [] } as unknown as Vehicle
}

const FLEET = [vehicle('v1', 'Accord', 'FL-AAA-1'), vehicle('v2', 'Civic', 'FL-BBB-2')]

function booking(reference: string, overrides: Partial<Booking> = {}): Booking {
  return {
    reference,
    status: 'Confirmed',
    customer: { name: 'Marisol Vega' },
    vehicleId: 'v1',
    vehicleName: 'Honda Accord',
    vehiclePlate: 'FL-AAA-1',
    pickupLocation: 'Miami',
    returnLocation: 'Miami',
    pickupAt: at(16, 9).toISOString(),
    returnAt: at(19, 9).toISOString(),
    pricing: { total: 420 },
    payment: { state: 'unpaid', paid: 0, refunded: 0 },
    contract: {},
    ...overrides,
  } as Booking
}

function Address() {
  return <output data-testid="address">{useLocation().search}</output>
}

function renderPage(search = '?date=2026-09-16') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/calendar${search}`]}>
        <TooltipProvider delayDuration={0}>
          <CalendarPage />
        </TooltipProvider>
        <Address />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup({ delay: null })
}

const bar = (reference: string) => screen.queryByRole('button', { name: new RegExp(`^${reference}:`) })

beforeEach(() => {
  // Only the date: the queries and the popovers still wait on real timers.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(at(16, 12))
  calendar.mockReset()
  calendar.mockResolvedValue([booking('BK-1')])
})

afterEach(() => {
  vi.useRealTimers()
  useOrganizationStore.setState({ membership: null })
})

describe('the booking calendar', () => {
  it('asks for the month on show and draws each rental on its car, idle cars included', async () => {
    renderPage()

    expect(
      await screen.findByRole('button', { name: /^BK-1: Marisol Vega, Honda Accord, Confirmed/ }),
    ).toBeVisible()
    expect(screen.getByText('Honda Civic')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'September 2026' })).toBeInTheDocument()
    expect(calendar).toHaveBeenCalledWith(at(1).toISOString(), at(1, 0, 9).toISOString())
  })

  it('labels a bar with the renter and the reference, and names it in full on hover', async () => {
    const user = renderPage()
    const trip = await screen.findByRole('button', { name: /^BK-1:/ })

    expect(within(trip).getByText('Marisol Vega')).toBeInTheDocument()
    expect(within(trip).getByText('BK-1')).toBeInTheDocument()
    // What a bar too short for either falls back to.
    expect(within(trip).getByText('MV')).toBeInTheDocument()

    await user.hover(trip)
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Marisol Vega · BK-1')
  })

  it('keys every status in the legend with its bookings list badge colour', async () => {
    renderPage()
    await screen.findByRole('button', { name: /^BK-1:/ })

    for (const status of CALENDAR_STATUSES) {
      const { bg, fg } = statusColors(status)
      const marker = screen.getByRole('button', { name: status }).querySelector('[aria-hidden]')

      // A filled badge has no pale fill to edge, so its square is the fill alone.
      const edge = status === 'On rental' || status === 'Overdue' ? bg : fg

      // Filled with the strong colour; only a request keeps its box's pale fill and dashed edge.
      expect(marker?.getAttribute('style'), status).toContain(
        `background: ${status === 'Pending' ? bg : edge}`,
      )
      expect(marker?.getAttribute('style'), status).toContain(`border-color: ${edge}`)
      expect(marker?.className.includes('border-dashed'), status).toBe(status === 'Pending')
    }
    // The box itself, from the same two colours.
    const box = screen.getByRole('button', { name: /^BK-1:/ }).getAttribute('style')
    expect(box).toContain(statusColors('Confirmed').bg)
    expect(box).toContain(`color: ${statusColors('Confirmed').fg}`)
  })

  it('opens a summary that links to the booking', async () => {
    const user = renderPage()

    await user.click(await screen.findByRole('button', { name: /^BK-1:/ }))

    expect(screen.getByRole('link', { name: 'Open booking' })).toHaveAttribute('href', '/bookings/BK-1')
    expect(screen.getByText('$420')).toBeInTheDocument()
  })

  it('keeps cancelled bookings off the rows until the legend switches them on', async () => {
    calendar.mockResolvedValue([booking('BK-1'), booking('BK-2', { status: 'Cancelled', vehicleId: 'v2' })])
    const user = renderPage()

    await screen.findByRole('button', { name: /^BK-1:/ })
    expect(bar('BK-2')).not.toBeInTheDocument()
    expect(screen.getByText('1 booking in view')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelled' }))
    expect(bar('BK-2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirmed' }))
    expect(bar('BK-1')).not.toBeInTheDocument()
    // Its car stays: the row being empty is the answer.
    expect(screen.getByText('Honda Accord')).toBeInTheDocument()
  })

  it('narrows to the cars and rentals a search matches', async () => {
    const user = renderPage()
    await screen.findByRole('button', { name: /^BK-1:/ })

    await user.type(screen.getByRole('textbox'), 'civic')

    expect(screen.queryByText('Honda Accord')).not.toBeInTheDocument()
    expect(screen.getByText('Honda Civic')).toBeInTheDocument()
    expect(screen.getByTestId('address')).toHaveTextContent('q=civic')
  })

  it('steps to the next month and fetches it', async () => {
    const user = renderPage()
    await screen.findByRole('button', { name: /^BK-1:/ })

    await user.click(screen.getByRole('button', { name: 'Next month' }))

    expect(await screen.findByRole('heading', { name: 'October 2026' })).toBeInTheDocument()
    await waitFor(() =>
      expect(calendar).toHaveBeenLastCalledWith(at(1, 0, 9).toISOString(), at(1, 0, 10).toISOString()),
    )
  })

  it('opens a day from the year overview', async () => {
    const user = renderPage('?view=year&date=2026-09-16')

    await user.click(await screen.findByRole('button', { name: 'Wed, Sep 16: 1 of 2 vehicles out' }))

    expect(await screen.findByRole('heading', { name: 'Wed, September 16, 2026' })).toBeInTheDocument()
    expect(screen.getByTestId('address')).toHaveTextContent('?view=day&date=2026-09-16')
  })

  it("opens on the company's today once its zone is known, when the address names no day", async () => {
    // 05:00 UTC on 1 October: already October in New York and UTC, still 30 September in Honolulu.
    vi.setSystemTime(new Date('2026-10-01T05:00:00Z'))
    useOrganizationStore.setState({ membership: { timezone: 'UTC' } as OrganizationMembership })
    renderPage('')
    expect(await screen.findByRole('heading', { name: 'October 2026' })).toBeInTheDocument()

    act(() =>
      useOrganizationStore.setState({
        membership: { timezone: 'Pacific/Honolulu' } as OrganizationMembership,
      }),
    )

    expect(await screen.findByRole('heading', { name: 'September 2026' })).toBeInTheDocument()
  })
})
