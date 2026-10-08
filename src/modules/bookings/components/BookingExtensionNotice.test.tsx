import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { bookingKeys } from '@/modules/bookings/hooks/use-bookings'
import type { BookingExtension, BookingExtensions } from '@/modules/payments/types/booking-extension.types'
import { siteUrl } from '@/modules/vehicles/utils/public-links'
import { useOrganizationStore } from '@/state/organization.store'
import { BookingExtensionNotice } from './BookingExtensionNotice'

const get = vi.fn<() => Promise<BookingExtensions>>()
const cancel = vi.fn<(reference: string) => Promise<BookingExtensions>>()
const recordPaid = vi.fn<(reference: string, method: string) => Promise<BookingExtensions>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))
vi.mock('@/modules/payments/api/booking-extension.api', () => ({
  bookingExtensionApi: {
    get: () => get(),
    cancel: (reference: string) => cancel(reference),
    recordPaid: (reference: string, method: string) => recordPaid(reference, method),
  },
}))

const PENDING: BookingExtension = {
  id: 'e1',
  status: 'pending',
  previousReturnAt: '2026-10-10T14:00:00Z',
  newReturnAt: '2026-10-12T14:00:00Z',
  previousTotal: 235.4,
  newTotal: 353.1,
  amount: 117.7,
  expiresAt: '2026-10-10T14:00:00Z',
  requestedAt: '2026-10-09T09:00:00Z',
  link: { token: 'tok', amount: 117.7, deposit: 0, currency: 'USD' },
  refundDue: 0,
  hasAddendum: false,
}
const WAITING: BookingExtensions = {
  extend: { allowed: false, reason: 'extension_pending' },
  pending: PENDING,
  history: [],
}
const APPLIED: BookingExtensions = {
  extend: { allowed: true },
  history: [{ ...PENDING, status: 'applied', link: undefined, hasAddendum: true }],
}

function renderNotice() {
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
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidated = vi.spyOn(client, 'invalidateQueries')
  render(
    <QueryClientProvider client={client}>
      <BookingExtensionNotice
        reference="BK-10001"
        renter={{ name: 'Marisol Vega', email: 'marisol@example.com', phone: '+1 305 442 0118' }}
        returnAt="2026-10-10T14:00:00Z"
        pickedUp
        extending={false}
        onExtendingChange={vi.fn()}
      />
    </QueryClientProvider>,
  )
  return { client, invalidated }
}

afterEach(() => {
  for (const mock of [get, cancel, recordPaid]) mock.mockReset()
  useOrganizationStore.setState({ membership: null })
})

describe('BookingExtensionNotice', () => {
  it('shows nothing on a booking with no request waiting and nothing to refund', async () => {
    get.mockResolvedValue({ extend: { allowed: true }, history: [] })
    renderNotice()

    await waitFor(() => expect(get).toHaveBeenCalled())
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('offers the renter link for a request waiting to be paid', async () => {
    get.mockResolvedValue(WAITING)
    const user = userEvent.setup({ delay: null })
    renderNotice()

    expect(await screen.findByRole('heading', { name: 'Extension waiting for payment' })).toBeInTheDocument()
    expect(screen.getByText('$117.70')).toBeInTheDocument()
    expect(screen.getByText('Not yet')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Send link' }))

    const dialog = await screen.findByRole('dialog', { name: 'Extension link' })
    expect(within(dialog).getByRole('textbox', { name: /link/i })).toHaveValue(
      `${siteUrl('sunstate')}/pay/tok`,
    )
  })

  it('records a payment taken at the counter, which puts the extension into effect', async () => {
    get.mockResolvedValue(WAITING)
    // The booking is re-read afterwards, and by then the API has it applied too.
    recordPaid.mockImplementation(async () => {
      get.mockResolvedValue(APPLIED)
      return APPLIED
    })
    const user = userEvent.setup({ delay: null })
    const { invalidated } = renderNotice()

    await user.click(await screen.findByRole('button', { name: 'Record payment' }))
    const dialog = await screen.findByRole('dialog', { name: 'Record the extension payment' })
    await user.click(within(dialog).getByRole('button', { name: 'Record and extend' }))

    await waitFor(() => expect(recordPaid).toHaveBeenCalledWith('BK-10001', 'Cash'))
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: 'Extension waiting for payment' }),
      ).not.toBeInTheDocument(),
    )
    // The return time and the total moved, so the booking itself is re-read.
    expect(invalidated).toHaveBeenCalledWith({ queryKey: bookingKeys.all })
  })

  it('withdraws the request only once the counter confirms it', async () => {
    get.mockResolvedValue(WAITING)
    cancel.mockResolvedValue({ extend: { allowed: true }, history: [{ ...PENDING, status: 'cancelled' }] })
    const user = userEvent.setup({ delay: null })
    renderNotice()

    await user.click(await screen.findByRole('button', { name: 'Withdraw' }))
    expect(cancel).not.toHaveBeenCalled()
    await user.click(await screen.findByRole('button', { name: 'Withdraw request' }))

    await waitFor(() => expect(cancel).toHaveBeenCalledWith('BK-10001'))
  })

  it('re-reads the booking when the renter pays on their own page', async () => {
    get.mockResolvedValue(WAITING)
    const { client, invalidated } = renderNotice()
    await screen.findByRole('heading', { name: 'Extension waiting for payment' })
    invalidated.mockClear()

    // What the poll finds once the renter has paid: nothing here did it.
    get.mockResolvedValue(APPLIED)
    await client.refetchQueries({ queryKey: [...bookingKeys.all, 'extensions', 'BK-10001'] })

    await waitFor(() => expect(invalidated).toHaveBeenCalledWith({ queryKey: bookingKeys.all }))
  })

  it("says when a payment came too late to count and is the renter's to have back", async () => {
    get.mockResolvedValue({
      extend: { allowed: true },
      history: [{ ...PENDING, status: 'expired', link: undefined, refundDue: 117.7 }],
    })
    renderNotice()

    expect(await screen.findByRole('heading', { name: 'Extension payment to refund' })).toBeInTheDocument()
    expect(screen.getByText('$117.70')).toBeInTheDocument()
  })
})
