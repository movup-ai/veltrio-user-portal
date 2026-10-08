import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { BookingContract } from '@/modules/contracts/types/booking-contract.types'
import type { BookingExtensions } from '@/modules/payments/types/booking-extension.types'
import { siteUrl } from '@/modules/vehicles/utils/public-links'
import { useOrganizationStore } from '@/state/organization.store'
import type { Permission } from '@/types/user'
import { BookingAgreementSection } from './BookingAgreementSection'

const get = vi.fn<() => Promise<BookingContract>>()
const issue = vi.fn<() => Promise<BookingContract>>()
const pdf = vi.fn<() => Promise<Blob>>()
const voidContract = vi.fn<(reference: string, reason: string) => Promise<BookingContract>>()
const extensions = vi.fn<() => Promise<BookingExtensions>>()
const addendum = vi.fn<(reference: string, extensionId: string) => Promise<Blob>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))

vi.mock('@/modules/contracts/api/booking-contract.api', () => ({
  bookingContractApi: {
    get: () => get(),
    issue: () => issue(),
    pdf: () => pdf(),
    void: (reference: string, reason: string) => voidContract(reference, reason),
  },
}))

vi.mock('@/modules/payments/api/booking-extension.api', () => ({
  bookingExtensionApi: {
    get: () => extensions(),
    addendum: (reference: string, extensionId: string) => addendum(reference, extensionId),
  },
}))

const ALLOWED = { allowed: true }
const NO_EXTENSIONS: BookingExtensions = { extend: ALLOWED, history: [] }
const LINK = { contractId: 'c1', token: 'tok' }
const NONE: BookingContract = {
  status: 'none',
  template: { id: 'tpl_1', name: 'Standard rental agreement', revision: 3 },
  actions: { sign: ALLOWED, void: { allowed: false, reason: 'not_issued' }, changeTemplate: ALLOWED },
}
const ISSUED: BookingContract = {
  ...NONE,
  status: 'issued',
  number: 'AGR-BK-10001',
  companySigner: 'Edward Thomas',
  link: LINK,
  actions: { ...NONE.actions, void: ALLOWED },
}
const SIGNED: BookingContract = {
  ...ISSUED,
  status: 'signed',
  signedAt: '2026-10-05T19:42:00Z',
  signerName: 'Marisol Vega',
  method: 'counter',
  actions: {
    sign: { allowed: false, reason: 'already_signed' },
    void: ALLOWED,
    changeTemplate: { allowed: false, reason: 'already_signed' },
  },
}

/** The value beside a label in the card's details. */
async function row(label: string) {
  return (await screen.findByText(label, { selector: 'dt' })).nextElementSibling as HTMLElement
}

function renderSection(permissions: Permission[] = []) {
  // Most bookings have none; the one test about addenda sets its own first.
  if (!extensions.getMockImplementation()) extensions.mockResolvedValue(NO_EXTENSIONS)
  useOrganizationStore.setState({
    membership: {
      organizationId: 't1',
      organizationName: 'Sunstate Car Co.',
      subdomain: 'sunstate',
      currency: 'USD',
      role: 'staff',
      permissions,
    },
  })
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BookingAgreementSection
        reference="BK-10001"
        renter={{ name: 'Marisol Vega', email: 'marisol@example.com', phone: '+1 305 442 0118' }}
      />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  for (const mock of [get, issue, pdf, voidContract, extensions, addendum]) mock.mockReset()
  useOrganizationStore.setState({ membership: null })
})

describe('BookingAgreementSection', () => {
  it('issues the agreement when it is first sent, then shows the link the renter signs on', async () => {
    get.mockResolvedValue(NONE)
    issue.mockResolvedValue(ISSUED)
    const user = userEvent.setup({ delay: null })
    renderSection()

    expect(await row('Renter')).toHaveTextContent('Not signed yet')
    expect(await row('Terms')).toHaveTextContent('Standard rental agreement · revision 3')
    // Nobody has signed for the company until there is an agreement to sign.
    expect(screen.queryByText('Company')).not.toBeInTheDocument()
    expect(screen.getByText("The keys can't be handed over until this is signed.")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Send for signature' }))

    expect(
      await screen.findByRole('heading', { name: 'Send the agreement for signature' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /link/i })).toHaveValue(`${siteUrl('sunstate')}/sign/c1/tok`)
    expect(issue).toHaveBeenCalledTimes(1)
  })

  it('opens the agreement to look at without issuing it, so the booking still reads as not sent', async () => {
    get.mockResolvedValue(NONE)
    pdf.mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' }))
    vi.spyOn(window, 'open').mockReturnValue({ location: { href: '' }, close: vi.fn() } as unknown as Window)
    const user = userEvent.setup({ delay: null })
    renderSection()

    await user.click(await screen.findByRole('button', { name: 'View' }))

    await waitFor(() => expect(pdf).toHaveBeenCalledTimes(1))
    // Looking is not sending: issuing here is what turned the badge to "Awaiting signature".
    expect(issue).not.toHaveBeenCalled()
    expect(get).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Not sent')).toBeInTheDocument()
  })

  it('reuses an agreement already out instead of issuing another', async () => {
    get.mockResolvedValue(ISSUED)
    const user = userEvent.setup({ delay: null })
    renderSection()

    await user.click(await screen.findByRole('button', { name: 'Send for signature' }))

    expect(
      await screen.findByRole('heading', { name: 'Send the agreement for signature' }),
    ).toBeInTheDocument()
    expect(issue).not.toHaveBeenCalled()
  })

  it('turns signing off with the reason once the booking no longer takes a signature', async () => {
    const cancelled = { allowed: false, reason: 'booking_cancelled' } as const
    get.mockResolvedValue({
      ...NONE,
      actions: { ...NONE.actions, sign: cancelled, changeTemplate: cancelled },
    })
    renderSection()

    const send = await screen.findByRole('button', { name: 'Send for signature' })
    expect(send).toBeDisabled()
    expect(send).toHaveAttribute('title', 'The booking is cancelled.')
    expect(screen.getByRole('button', { name: 'Sign at the counter' })).toBeDisabled()
    // Still viewable: before anything is issued, View shows a preview, which issues nothing.
    expect(screen.getByRole('button', { name: 'View' })).toBeEnabled()
    expect(screen.queryByText("The keys can't be handed over until this is signed.")).not.toBeInTheDocument()
  })

  it('offers nothing to send, sign or open on a reservation still waiting to be confirmed', async () => {
    const waiting = { allowed: false, reason: 'not_confirmed' } as const
    get.mockResolvedValue({ ...NONE, actions: { ...NONE.actions, sign: waiting, changeTemplate: waiting } })
    renderSection()

    expect(
      await screen.findByText('The agreement can be sent once the reservation is confirmed.'),
    ).toBeInTheDocument()
    for (const name of ['View', 'Send for signature', 'Sign at the counter']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
    expect(await row('Terms')).toHaveTextContent('Standard rental agreement · revision 3')
  })

  it('shows who signed and how, and offers the download in place of sending', async () => {
    get.mockResolvedValue(SIGNED)
    renderSection()

    // One row a party: who signed, with the renter's when and how beside their name.
    expect(await row('Renter')).toHaveTextContent(/^Marisol Vega · Oct \d+ · at the counter$/)
    expect(await row('Company')).toHaveTextContent('Edward Thomas')
    expect(await row('Terms')).toHaveTextContent('Standard rental agreement · revision 3')
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send for signature' })).not.toBeInTheDocument()
  })

  it('keeps voiding to those the API lets void, and asks for a reason first', async () => {
    get.mockResolvedValue(SIGNED)
    voidContract.mockResolvedValue(NONE)
    const user = userEvent.setup({ delay: null })
    renderSection(['contracts.void'])

    await user.click(await screen.findByRole('button', { name: 'More agreement actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Void agreement' }))
    await user.click(await screen.findByRole('button', { name: 'Void agreement' }))
    expect(await screen.findByText('Say why it is being voided.')).toBeInTheDocument()
    expect(voidContract).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText(/Reason/), 'Wrong name')
    await user.click(screen.getByRole('button', { name: 'Void agreement' }))
    await waitFor(() => expect(voidContract).toHaveBeenCalledWith('BK-10001', 'Wrong name'))
  })

  it('starts a void afresh after one was abandoned, without its reason or its error', async () => {
    get.mockResolvedValue(SIGNED)
    const user = userEvent.setup({ delay: null })
    renderSection(['contracts.void'])

    const openVoid = async () => {
      await user.click(await screen.findByRole('button', { name: 'More agreement actions' }))
      await user.click(await screen.findByRole('menuitem', { name: 'Void agreement' }))
    }
    await openVoid()
    await user.type(await screen.findByLabelText(/Reason/), ' ')
    await user.click(screen.getByRole('button', { name: 'Void agreement' }))
    expect(await screen.findByText('Say why it is being voided.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await openVoid()
    expect(await screen.findByLabelText(/Reason/)).toHaveValue('')
    expect(screen.queryByText('Say why it is being voided.')).not.toBeInTheDocument()
    expect(voidContract).not.toHaveBeenCalled()
  })

  it('lists the addenda for later returns the renter agreed to, oldest first, and opens one', async () => {
    const agreed = {
      status: 'applied' as const,
      previousReturnAt: '2026-10-10T14:00:00Z',
      previousTotal: 235.4,
      newTotal: 353.1,
      amount: 117.7,
      requestedAt: '2026-10-09T09:00:00Z',
      refundDue: 0,
      hasAddendum: true,
    }
    get.mockResolvedValue(SIGNED)
    extensions.mockResolvedValue({
      extend: ALLOWED,
      history: [
        { ...agreed, id: 'second', newReturnAt: '2026-10-14T14:00:00Z' },
        // Asked for and never paid: it changed nothing, so there is nothing to file.
        {
          ...agreed,
          id: 'lapsed',
          status: 'expired',
          newReturnAt: '2026-10-13T14:00:00Z',
          hasAddendum: false,
        },
        { ...agreed, id: 'first', newReturnAt: '2026-10-12T14:00:00Z' },
      ],
    })
    addendum.mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' }))
    vi.spyOn(window, 'open').mockReturnValue({ location: { href: '' }, close: vi.fn() } as unknown as Window)
    const user = userEvent.setup({ delay: null })
    renderSection()

    expect(await screen.findByText('Addendum 1')).toBeInTheDocument()
    expect(screen.getByText('Addendum 2')).toBeInTheDocument()
    expect(screen.queryByText('Addendum 3')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'View addendum 1' }))

    await waitFor(() => expect(addendum).toHaveBeenCalledWith('BK-10001', 'first'))
  })

  it('offers staff the renter copy link but not Void', async () => {
    get.mockResolvedValue(SIGNED)
    const user = userEvent.setup({ delay: null })
    renderSection()

    await user.click(await screen.findByRole('button', { name: 'More agreement actions' }))

    expect(await screen.findByRole('menuitem', { name: "Share the renter's copy" })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Void agreement' })).not.toBeInTheDocument()
  })
})
