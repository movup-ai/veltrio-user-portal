import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { PublicPayment } from '@/modules/payments/types/booking-payment.types'
import { ApiError } from '@/types/api'
import { PaymentPage } from './PaymentPage'

const publicPayment = vi.fn<() => Promise<PublicPayment>>()

vi.mock('@/modules/payments/api/booking-payment.api', () => ({
  bookingPaymentApi: { publicPayment: () => publicPayment() },
}))

// Stripe.js loads from Stripe's servers; the checkout has its own test.
vi.mock('@/modules/payments/components/RenterCheckout', () => ({
  RenterCheckout: ({ submitLabel, depositSecret }: { submitLabel: string; depositSecret?: string }) => (
    <div>
      checkout: {submitLabel}
      {depositSecret && ` then ${depositSecret}`}
    </div>
  ),
}))

const PAYMENT: PublicPayment = {
  companyName: 'Sunstate Car Co.',
  reference: 'BK-10001',
  renterName: 'Marisol Vega',
  vehicleName: 'Toyota Camry',
  pickupAt: '2026-10-01T13:30:00Z',
  returnAt: '2026-10-05T13:30:00Z',
  pickupLocation: 'Main Office',
  currency: 'USD',
  depositAmount: 2000,
  stripeAccountId: 'acct_1',
  charge: { status: 'open', amount: 319, clientSecret: 'pi_1_secret' },
}

const DEPOSIT_OPEN = { status: 'open', amount: 2000, clientSecret: 'pi_2_secret' } as const

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/pay/t1/token']}>
        <Routes>
          <Route path="/pay/:tenantId/:token" element={<PaymentPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('PaymentPage', () => {
  it('shows the rental and the checkout while there is something to pay', async () => {
    publicPayment.mockResolvedValue(PAYMENT)
    renderPage()

    expect(await screen.findByText('checkout: Pay $319')).toBeInTheDocument()
    // The company leads: the renter is paying them, and may never have heard of Veltrio.
    expect(screen.getByText('Sunstate Car Co.')).toBeInTheDocument()
    expect(screen.getByText('Booking BK-10001')).toBeInTheDocument()
    expect(screen.getByText('Hi Marisol, check the details below before you pay.')).toBeInTheDocument()
    expect(screen.getByText('$319')).toBeInTheDocument()
  })

  it('pays and holds the deposit in one go when the link asks for both', async () => {
    publicPayment.mockResolvedValue({ ...PAYMENT, deposit: DEPOSIT_OPEN })
    renderPage()

    expect(await screen.findByText('checkout: Pay $319 & hold $2,000 then pi_2_secret')).toBeInTheDocument()
    expect(screen.getByText('Security deposit hold')).toBeInTheDocument()
  })

  it('asks for the deposit on its own once the rental is paid', async () => {
    publicPayment.mockResolvedValue({
      ...PAYMENT,
      charge: { status: 'paid', amount: 319 },
      deposit: DEPOSIT_OPEN,
    })
    renderPage()

    expect(await screen.findByText('checkout: Authorise $2,000 hold')).toBeInTheDocument()
  })

  it('titles a deposit-only link for what it is', async () => {
    publicPayment.mockResolvedValue({ ...PAYMENT, charge: undefined, deposit: DEPOSIT_OPEN })
    renderPage()

    expect(await screen.findByText('Security deposit')).toBeInTheDocument()
    expect(screen.queryByText('Amount due')).not.toBeInTheDocument()
  })

  it('is done once paid and held, with no way to pay twice', async () => {
    publicPayment.mockResolvedValue({
      ...PAYMENT,
      charge: { status: 'paid', amount: 319 },
      deposit: { status: 'held', amount: 2000 },
    })
    renderPage()

    expect(await screen.findByText("You're all set")).toBeInTheDocument()
    expect(screen.queryByText(/checkout/)).not.toBeInTheDocument()
  })

  it('lets the renter open a receipt once they have paid', async () => {
    publicPayment.mockResolvedValue({
      ...PAYMENT,
      charge: { status: 'paid', amount: 319 },
      receipt: { tenantId: 't1', bookingId: 'b1', token: 'receipt-token' },
    })
    renderPage()

    expect(await screen.findByRole('link', { name: 'View receipt' })).toHaveAttribute(
      'href',
      `${window.location.origin}/receipt/t1/b1/receipt-token`,
    )
  })

  it('says the deposit comes separately when the link did not ask for it', async () => {
    publicPayment.mockResolvedValue({ ...PAYMENT, charge: { status: 'paid', amount: 319 } })
    renderPage()

    expect(await screen.findByText('Payment received')).toBeInTheDocument()
    expect(screen.getByText(/separate link for the \$2,000 security deposit/)).toBeInTheDocument()
  })

  it("shows the vehicle's cover photo when it has one", async () => {
    publicPayment.mockResolvedValue({ ...PAYMENT, vehiclePhotoUrl: 'https://media.test/camry.webp' })
    renderPage()

    expect(await screen.findByRole('img', { name: 'Toyota Camry' })).toHaveAttribute(
      'src',
      'https://media.test/camry.webp',
    )
  })

  it('describes the vehicle apart from the booking', async () => {
    publicPayment.mockResolvedValue({
      ...PAYMENT,
      vehicleSpecs: { year: 2023, type: 'Sedan', transmission: 'Automatic', fuelType: 'Hybrid', seats: 5 },
    })
    renderPage()

    expect(await screen.findByText('2023 · Sedan · Automatic · 5 seats · Hybrid')).toBeInTheDocument()
    expect(screen.getByText('· Main Office', { exact: false })).toBeInTheDocument()
  })

  it('shows no photo for a vehicle without one', async () => {
    publicPayment.mockResolvedValue(PAYMENT)
    renderPage()

    await screen.findByText('Toyota Camry')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('tells the renter a replaced or wrong link is not valid, without retrying', async () => {
    publicPayment.mockRejectedValue(
      new ApiError('not_found', 'This payment link is not valid', { status: 404 }),
    )
    renderPage()

    expect(await screen.findByText("This payment link isn't valid")).toBeInTheDocument()
    expect(publicPayment).toHaveBeenCalledOnce()
  })

  it('does not call a link dead when Stripe blips: it retries, then offers to try again', async () => {
    // What happened on a real sandbox: Stripe unreachable for one read, so the API answered 503.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    publicPayment.mockRejectedValue(new ApiError('server_error', 'Stripe is unavailable', { status: 503 }))
    renderPage()

    await vi.advanceTimersByTimeAsync(10_000)
    expect(await screen.findByText("We couldn't load your payment")).toBeInTheDocument()
    expect(screen.queryByText("This payment link isn't valid")).not.toBeInTheDocument()
    expect(publicPayment).toHaveBeenCalledTimes(3)

    publicPayment.mockResolvedValue(PAYMENT)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('checkout: Pay $319')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('says a withdrawn link is closed and who to ask', async () => {
    publicPayment.mockResolvedValue({ ...PAYMENT, charge: { status: 'closed', amount: 319 } })
    renderPage()

    expect(await screen.findByText('Ask Sunstate Car Co. for a new payment link.')).toBeInTheDocument()
  })
})
