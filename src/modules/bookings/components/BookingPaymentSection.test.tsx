import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type {
  BookingPaymentRecord,
  BookingPayments,
  PaymentActions,
  PaymentLink,
  ReceiptLink,
} from '@/modules/payments/types/booking-payment.types'
import { siteUrl } from '@/modules/vehicles/utils/public-links'
import { useOrganizationStore } from '@/state/organization.store'
import type { BookingChargeLine } from '../types/booking.types'
import { BookingPaymentSection } from './BookingPaymentSection'

const get = vi.fn<() => Promise<BookingPayments>>()
const createLink = vi.fn<() => Promise<PaymentLink>>()
const requestDeposit = vi.fn<() => Promise<PaymentLink>>()
const documentPdf = vi.fn<(kind: string) => Promise<Blob>>()
const receiptLink = vi.fn<() => Promise<ReceiptLink>>()
const saveBlob = vi.fn()
const refund = vi.fn<(...args: unknown[]) => Promise<BookingPayments>>()

vi.mock('@/lib/download', () => ({ saveBlob: (blob: Blob, name: string) => saveBlob(blob, name) }))

vi.mock('@/modules/payments/api/booking-payment.api', () => ({
  bookingPaymentApi: {
    get: () => get(),
    createLink: () => createLink(),
    requestDeposit: () => requestDeposit(),
    document: (_reference: string, kind: string) => documentPdf(kind),
    receiptLink: () => receiptLink(),
    refund: (...args: unknown[]) => refund(...args),
  },
}))

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))

const ALLOWED = { allowed: true }

const ACTIONS: PaymentActions = {
  sendLink: ALLOWED,
  linkIncludesDeposit: false,
  markPaid: ALLOWED,
  requestDeposit: ALLOWED,
  captureDeposit: { allowed: false, reason: 'no_deposit_held' },
  releaseDeposit: { allowed: false, reason: 'no_deposit_held' },
  pickUp: { allowed: false, reason: 'not_fully_paid' },
  returnVehicle: { allowed: false, reason: 'not_on_rental' },
}

const LINK: PaymentLink = { token: 'secret-token', amount: 319, deposit: 0, currency: 'USD' }

const UNPAID: BookingPayments = {
  available: true,
  state: 'unpaid',
  currency: 'USD',
  total: 319,
  paid: 0,
  refunded: 0,
  balance: 319,
  depositAmount: 2000,
  openLink: false,
  depositRequested: false,
  actions: ACTIONS,
  payments: [],
}

const CHARGE: BookingPaymentRecord = {
  id: 'p1',
  kind: 'charge',
  status: 'succeeded',
  amount: 319,
  captured: 319,
  refunded: 0,
  currency: 'USD',
  method: 'Visa ·· 4242',
  completedAt: '2026-10-03T09:00:00Z',
  createdAt: '2026-10-03T08:00:00Z',
}

const RENTAL_PAID: BookingPayments = {
  ...UNPAID,
  state: 'rental_paid',
  paid: 319,
  balance: 0,
  actions: {
    ...ACTIONS,
    sendLink: { allowed: false, reason: 'nothing_to_collect' },
    markPaid: { allowed: false, reason: 'nothing_to_collect' },
    requestDeposit: ALLOWED,
  },
  payments: [CHARGE],
}

const HELD: BookingPayments = {
  ...RENTAL_PAID,
  state: 'paid',
  deposit: {
    ...CHARGE,
    id: 'd1',
    kind: 'deposit',
    status: 'held',
    amount: 2000,
    captured: 0,
    captureBefore: '2026-10-09T12:00:00Z',
  },
  actions: {
    ...RENTAL_PAID.actions,
    requestDeposit: { allowed: false, reason: 'deposit_already_held' },
    captureDeposit: { allowed: false, reason: 'not_returned' },
    releaseDeposit: { allowed: false, reason: 'not_returned' },
    pickUp: ALLOWED,
  },
}

function renderAs(permissions: string[], charges: BookingChargeLine[] = []) {
  useOrganizationStore.setState({
    membership: {
      organizationId: 'org_1',
      organizationName: 'Sunstate Car Co.',
      subdomain: 'sunstate',

      currency: 'USD',
      role: 'owner',
      permissions: permissions as never,
    },
  })
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BookingPaymentSection
        reference="BK-10001"
        renter={{ name: 'Marisol Vega', email: 'marisol@example.com', phone: '+1 305 442 0118' }}
        charges={charges}
        days={1}
      />
    </QueryClientProvider>,
  )
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => useOrganizationStore.setState({ membership: null }))

describe('BookingPaymentSection', () => {
  it('opens a payment link the counter can copy, email or text', async () => {
    get.mockResolvedValue(UNPAID)
    createLink.mockResolvedValue(LINK)
    const user = userEvent.setup({ delay: null })
    renderAs([])

    await user.click(await screen.findByRole('button', { name: 'Send payment link' }))

    const dialog = await screen.findByRole('dialog')
    const url = `${siteUrl('sunstate')}/pay/secret-token`
    const field = await within(dialog).findByDisplayValue(url)
    // Focus lands on the dialog, not the field, which would read as already selected.
    expect(dialog).toHaveFocus()
    expect(field).not.toHaveFocus()
    expect(within(dialog).getByRole('link', { name: /^Email/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^mailto:marisol%40example\.com\?subject=/),
    )
    expect(within(dialog).getByRole('link', { name: /^Text/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^sms:\+13054420118\?&body=.*secret-token/),
    )
    // Too early for the deposit, so the counter is told it comes separately.
    expect(within(dialog).getByText(/\$2,000 security deposit is asked for separately/)).toBeInTheDocument()
  })

  it('spins the button while Stripe makes the link, then opens it ready to share', async () => {
    // A dialog opened before the link existed showed an empty field and dead buttons.
    get.mockResolvedValue(UNPAID)
    let finish: (link: PaymentLink) => void = () => {}
    createLink.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    const user = userEvent.setup({ delay: null })
    renderAs([])

    const send = await screen.findByRole('button', { name: 'Send payment link' })
    await user.click(send)

    expect(send).toHaveAttribute('aria-busy', 'true')
    expect(send).toBeDisabled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    finish(LINK)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Rental payment')).toBeInTheDocument()
    expect(within(dialog).getByText('$319')).toBeInTheDocument()
    expect(within(dialog).getByDisplayValue(/\/pay\/secret-token$/)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Copy' })).toBeEnabled()
  })

  it('opens nothing when the link cannot be made', async () => {
    get.mockResolvedValue(UNPAID)
    createLink.mockRejectedValue(new Error('Stripe is unavailable'))
    const user = userEvent.setup({ delay: null })
    renderAs([])

    const send = await screen.findByRole('button', { name: 'Send payment link' })
    await user.click(send)

    await waitFor(() => expect(send).toBeEnabled())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('says why links are off until Stripe is connected', async () => {
    get.mockResolvedValue({
      ...UNPAID,
      available: false,
      actions: { ...ACTIONS, sendLink: { allowed: false, reason: 'payments_not_ready' } },
    })
    renderAs([])

    expect(await screen.findByRole('button', { name: 'Send payment link' })).toBeDisabled()
    expect(screen.getByText(/Connect Stripe in Settings/)).toBeInTheDocument()
  })

  it('asks for the deposit in the same link from the day before pickup', async () => {
    get.mockResolvedValue({
      ...UNPAID,
      actions: { ...ACTIONS, linkIncludesDeposit: true, requestDeposit: ALLOWED },
    })
    createLink.mockResolvedValue({ ...LINK, deposit: 2000 })
    const user = userEvent.setup({ delay: null })
    renderAs([])

    await user.click(await screen.findByRole('button', { name: 'Send payment & deposit link' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Payment and deposit link' })).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /^Text/ })).toHaveAttribute(
      'href',
      expect.stringContaining(encodeURIComponent('authorise the $2,000 security deposit')),
    )
  })

  it('offers Request deposit any time before pickup, behind the payment link', async () => {
    get.mockResolvedValue(UNPAID)
    renderAs([])

    const request = await screen.findByRole('button', { name: 'Request deposit' })
    expect(request).toBeEnabled()
    expect(request.className).not.toContain('bg-primary')
    expect(screen.getByText('Not held')).toBeInTheDocument()
    expect(screen.getByText(/hold lasts about 7 days/)).toBeInTheDocument()
  })

  it('drops the timing note once the car is out', async () => {
    get.mockResolvedValue({
      ...UNPAID,
      actions: { ...ACTIONS, pickUp: { allowed: false, reason: 'not_before_pickup' } },
    })
    renderAs([])

    await screen.findByRole('button', { name: 'Request deposit' })
    expect(screen.queryByText(/hold lasts about 7 days/)).not.toBeInTheDocument()
  })

  it('shows a link out as waiting on the renter, and offers to resend it', async () => {
    get.mockResolvedValue({
      ...UNPAID,
      openLink: true,
      payments: [{ ...CHARGE, status: 'requires_payment' }],
    })
    renderAs([])

    expect(await screen.findByText('Awaiting payment')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resend payment link' })).toBeEnabled()
    // The badge says it; a history line for money not yet taken would only repeat it.
    expect(screen.queryByText('Payments')).not.toBeInTheDocument()
  })

  it('says the renter has a deposit link to answer', async () => {
    get.mockResolvedValue({ ...UNPAID, depositRequested: true })
    renderAs([])

    expect(await screen.findByText('Awaiting renter')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resend deposit link' })).toBeEnabled()
    // Asked for already: when the hold runs out matters now, not when to ask.
    expect(screen.getByText(/7 days from when the renter authorises it/)).toBeInTheDocument()
    expect(screen.queryByText(/request it close to pickup/)).not.toBeInTheDocument()
  })

  it('leads with Request deposit once the rental is paid, and sends its own link', async () => {
    get.mockResolvedValue(RENTAL_PAID)
    requestDeposit.mockResolvedValue({ ...LINK, amount: 0, deposit: 2000 })
    const user = userEvent.setup({ delay: null })
    renderAs([])

    const request = await screen.findByRole('button', { name: 'Request deposit' })
    expect(request.className).toContain('bg-primary')
    expect(screen.getByText('Rental paid')).toBeInTheDocument()
    expect(screen.queryByText('Balance')).not.toBeInTheDocument()
    await user.click(request)

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Deposit link' })).toBeInTheDocument()
    expect(within(dialog).getByText('Security deposit hold')).toBeInTheDocument()
    expect(within(dialog).queryByText('Rental payment')).not.toBeInTheDocument()
  })

  it('keeps Capture and Release off until the vehicle is back', async () => {
    get.mockResolvedValue(HELD)
    renderAs([])

    expect(await screen.findByRole('button', { name: 'Release' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Capture' })).toBeDisabled()
    expect(screen.getByText(/once the vehicle is back/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Request deposit' })).not.toBeInTheDocument()
    expect(screen.getByText('Fully paid')).toBeInTheDocument()
    // Reserved, not taken: a lock rather than the dot that Fully paid carries.
    expect(screen.getByText('On hold').querySelector('svg')).not.toBeNull()
    expect(screen.getByText('Fully paid').querySelector('svg')).toBeNull()
    expect(screen.getByText(/^Held until Oct 9/)).toBeInTheDocument()
  })

  it('settles the deposit after the return', async () => {
    get.mockResolvedValue({
      ...HELD,
      actions: { ...HELD.actions, captureDeposit: ALLOWED, releaseDeposit: ALLOWED },
    })
    renderAs([])

    expect(await screen.findByRole('button', { name: 'Release' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Capture' })).toBeEnabled()
    expect(screen.queryByText(/once the vehicle is back/)).not.toBeInTheDocument()
  })

  it('shows what a part payment leaves', async () => {
    get.mockResolvedValue({ ...UNPAID, paid: 100, balance: 219 })
    renderAs([])

    expect(await screen.findByText('Balance')).toBeInTheDocument()
    expect(screen.getByText('$219')).toBeInTheDocument()
  })

  it('offers neither the invoice nor the receipt until something is paid', async () => {
    get.mockResolvedValue(UNPAID)
    renderAs([])

    expect(await screen.findByRole('button', { name: 'Mark as paid' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Invoice' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Receipt' })).not.toBeInTheDocument()
  })

  it('lets a part payment have its receipt while the rest is still asked for', async () => {
    get.mockResolvedValue({
      ...UNPAID,
      paid: 100,
      balance: 219,
      payments: [{ ...CHARGE, amount: 100, captured: 100 }],
    })
    renderAs([])

    expect(await screen.findByRole('button', { name: 'Receipt' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Invoice' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Send payment link' })).toBeEnabled()
  })

  it('downloads the invoice under its number', async () => {
    get.mockResolvedValue(RENTAL_PAID)
    const pdf = new Blob(['%PDF'], { type: 'application/pdf' })
    documentPdf.mockResolvedValue(pdf)
    const user = userEvent.setup({ delay: null })
    renderAs([])

    await user.click(await screen.findByRole('button', { name: 'Invoice' }))

    await waitFor(() => expect(saveBlob).toHaveBeenCalledWith(pdf, 'INV-BK-10001.pdf'))
    expect(documentPdf).toHaveBeenCalledWith('invoice')
  })

  it('shares the receipt as a link, with the PDF for the counter', async () => {
    get.mockResolvedValue(RENTAL_PAID)
    receiptLink.mockResolvedValue({ bookingId: 'b1', token: 'receipt-token' })
    documentPdf.mockResolvedValue(new Blob(['%PDF']))
    const user = userEvent.setup({ delay: null })
    renderAs([])

    await user.click(await screen.findByRole('button', { name: 'Receipt' }))

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByDisplayValue(`${siteUrl('sunstate')}/receipt/b1/receipt-token`),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('Paid for the rental')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Download PDF' }))
    await waitFor(() => expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'RCT-BK-10001.pdf'))
  })

  it('offers refunds only to those allowed to give money back', async () => {
    get.mockResolvedValue(RENTAL_PAID)
    renderAs([])
    await screen.findByText('Payments')
    expect(screen.queryByRole('button', { name: 'Refund' })).not.toBeInTheDocument()
  })

  it('opens Record a payment on the dialog, not its first field, with the balance up front', async () => {
    get.mockResolvedValue(UNPAID)
    const user = userEvent.setup({ delay: null })
    renderAs([])

    await user.click(await screen.findByRole('button', { name: 'Mark as paid' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveFocus()
    expect(within(dialog).getByText('Balance due')).toBeInTheDocument()
    expect(within(dialog).getByText(/up to the \$319 still owed/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('combobox'))
    expect(await screen.findByRole('option', { name: 'Zelle' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Bank transfer (wire / ACH)' })).toBeInTheDocument()
  })

  it('offers a refund on money taken, to a manager', async () => {
    get.mockResolvedValue(RENTAL_PAID)
    renderAs(['payments.refund'])

    expect(await screen.findByRole('button', { name: 'Refund' })).toBeEnabled()
  })

  it('keeps a typed refund amount when another payment is picked', async () => {
    // A partial refund must not quietly become the other payment's full amount.
    const cash = { ...CHARGE, id: 'p2', kind: 'manual' as const, method: 'Cash', amount: 100, captured: 100 }
    get.mockResolvedValue({ ...RENTAL_PAID, payments: [CHARGE, cash] })
    const user = userEvent.setup({ delay: null })
    renderAs(['payments.refund'])

    await user.click(await screen.findByRole('button', { name: 'Refund' }))
    const dialog = await screen.findByRole('dialog')
    const amount = within(dialog).getByLabelText('Amount to refund')
    expect(amount).toHaveValue(319)
    await user.clear(amount)
    await user.type(amount, '50')
    await user.click(within(dialog).getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /^Cash/ }))

    // Found again: a field rebuilt for the new payment would still be a fresh element.
    expect(within(dialog).getByLabelText('Amount to refund')).toHaveValue(50)
    expect(within(dialog).getByText('$100')).toBeInTheDocument()
  })

  it('follows the picked payment while nothing has been typed', async () => {
    const cash = { ...CHARGE, id: 'p2', kind: 'manual' as const, method: 'Cash', amount: 100, captured: 100 }
    get.mockResolvedValue({ ...RENTAL_PAID, payments: [CHARGE, cash] })
    const user = userEvent.setup({ delay: null })
    renderAs(['payments.refund'])

    await user.click(await screen.findByRole('button', { name: 'Refund' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /^Cash/ }))

    expect(within(dialog).getByLabelText('Amount to refund')).toHaveValue(100)
  })

  it('keeps the refund id after the dialog was closed on an unclear answer', async () => {
    // The refund may have gone through: asking for it again must not make a second one.
    get.mockResolvedValue(RENTAL_PAID)
    refund.mockRejectedValueOnce(new Error('Network error')).mockResolvedValue(RENTAL_PAID)
    const user = userEvent.setup({ delay: null })
    renderAs(['payments.refund'])

    await user.click(await screen.findByRole('button', { name: 'Refund' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Refund' }))
    await waitFor(() => expect(refund).toHaveBeenCalledTimes(1))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    await user.click(await screen.findByRole('button', { name: 'Refund' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Refund' }))

    await waitFor(() => expect(refund).toHaveBeenCalledTimes(2))
    expect(refund.mock.calls[1][3]).toBe(refund.mock.calls[0][3])
  })

  it('gives a changed refund an id of its own', async () => {
    get.mockResolvedValue(RENTAL_PAID)
    refund.mockRejectedValueOnce(new Error('Network error')).mockResolvedValue(RENTAL_PAID)
    const user = userEvent.setup({ delay: null })
    renderAs(['payments.refund'])

    await user.click(await screen.findByRole('button', { name: 'Refund' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Refund' }))
    await waitFor(() => expect(refund).toHaveBeenCalledTimes(1))
    const amount = within(dialog).getByLabelText('Amount to refund')
    await user.clear(amount)
    await user.type(amount, '100')
    await user.click(within(dialog).getByRole('button', { name: 'Refund' }))

    await waitFor(() => expect(refund).toHaveBeenCalledTimes(2))
    expect(refund.mock.calls[1][3]).not.toBe(refund.mock.calls[0][3])
  })

  it("prices the charges in the booking's own currency, like its total", async () => {
    get.mockResolvedValue({ ...UNPAID, currency: 'EUR' })
    renderAs([], [{ key: 'extraFee', label: 'Airport fee', amount: 25 }])

    expect(await screen.findByText('€25')).toBeInTheDocument()
  })

  it('sends the same refund id when Refund is pressed again, and a new one next time', async () => {
    // A lost answer must not become a second refund: Stripe sees the same request twice.
    get.mockResolvedValue(RENTAL_PAID)
    refund.mockRejectedValueOnce(new Error('Network error')).mockResolvedValue(RENTAL_PAID)
    const user = userEvent.setup({ delay: null })
    renderAs(['payments.refund'])

    await user.click(await screen.findByRole('button', { name: 'Refund' }))
    let dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Refund' }))
    await waitFor(() => expect(refund).toHaveBeenCalledTimes(1))
    await user.click(within(dialog).getByRole('button', { name: 'Refund' }))
    await waitFor(() => expect(refund).toHaveBeenCalledTimes(2))
    const [first, retry] = refund.mock.calls.map((call) => call[3])
    expect(retry).toBe(first)

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Refund' }))
    dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Refund' }))
    await waitFor(() => expect(refund).toHaveBeenCalledTimes(3))
    expect(refund.mock.calls[2][3]).not.toBe(first)
  })
})
