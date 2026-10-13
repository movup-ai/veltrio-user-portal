import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { BookingActivityEvent } from '../types/booking.types'
import { BookingActivity } from './BookingActivity'

const activity = vi.fn<(reference: string) => Promise<BookingActivityEvent[]>>()

vi.mock('../api/booking.api', () => ({
  bookingApi: { activity: (reference: string) => activity(reference) },
}))

const STAFF = { kind: 'staff', name: 'Pat Owner' } as const

function event(
  id: string,
  type: string,
  overrides: Partial<BookingActivityEvent> = {},
): BookingActivityEvent {
  return { id, type, at: '2026-10-14T15:44:00Z', actor: STAFF, detail: {}, ...overrides }
}

function renderCard(props: { electric?: boolean } = {}) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BookingActivity reference="BK-10001" {...props} />
    </QueryClientProvider>,
  )
}

const rows = async () => within(await screen.findByRole('list')).getAllByRole('listitem')

afterEach(() => activity.mockReset())

describe('BookingActivity', () => {
  it('lists what the API says happened, newest first, with who did it and the figure beside it', async () => {
    activity.mockResolvedValue([
      event('e3', 'payment_received', {
        actor: { kind: 'renter' },
        detail: { amount: 235.4, method: 'Visa ·· 4242', for: 'rental' },
      }),
      event('e2', 'payment_link_created', { detail: { amount: 235.4, deposit: 0 } }),
      event('e1', 'created', { detail: { vehicleName: 'Toyota Camry', total: 235.4 } }),
    ])
    renderCard()

    const [paid, link, created] = await rows()

    expect(activity).toHaveBeenCalledWith('BK-10001')
    expect(paid).toHaveTextContent('Payment received')
    expect(paid).toHaveTextContent(/· Renter · \$235\.40 · Visa ·· 4242$/)
    expect(link).toHaveTextContent(/Payment link created.*· Pat Owner · \$235\.40$/)
    expect(created).toHaveTextContent(/Booking created.*· Pat Owner · Toyota Camry · \$235\.40$/)
  })

  it('shows an action logged before details were kept with its time and who, and nothing made up', async () => {
    activity.mockResolvedValue([event('e1', 'payment_recorded')])
    renderCard()

    const [recorded] = await rows()

    expect(recorded).toHaveTextContent(/Payment recorded.*· Pat Owner$/)
  })

  it('opens on the latest few, with the rest one press away', async () => {
    activity.mockResolvedValue(
      Array.from({ length: 11 }, (_, index) =>
        event(`e${index}`, index === 10 ? 'created' : 'payment_recorded'),
      ),
    )
    const user = userEvent.setup({ delay: null })
    renderCard()

    expect(await rows()).toHaveLength(8)
    expect(screen.queryByText('Booking created')).not.toBeInTheDocument()
    // Says how many more there are, not the total: that is what pressing it brings.
    await user.click(screen.getByRole('button', { name: 'Show 3 earlier events' }))

    expect(await rows()).toHaveLength(11)
    expect(screen.getByText('Booking created')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show fewer' }))
    expect(await rows()).toHaveLength(8)
  })

  it('reads a handover for charge on an electric car', async () => {
    activity.mockResolvedValue([event('e1', 'picked_up', { detail: { odometer: 12000, fuelLevel: 8 } })])
    renderCard({ electric: true })

    expect((await rows())[0]).toHaveTextContent(/12,000 mi · Charge Full$/)
  })

  it('says so when the activity cannot be read, rather than showing an empty history', async () => {
    activity.mockRejectedValue(new Error('offline'))
    renderCard()

    expect(await screen.findByText("We couldn't load the activity.")).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
