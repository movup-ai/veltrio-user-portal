import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { PublicReceipt } from '@/modules/payments/types/booking-payment.types'
import { ApiError } from '@/types/api'
import { ReceiptPage } from './ReceiptPage'

const publicReceipt = vi.fn<() => Promise<PublicReceipt>>()

vi.mock('@/modules/payments/api/booking-payment.api', () => ({
  bookingPaymentApi: {
    publicReceipt: () => publicReceipt(),
    receiptPdfUrl: ({ tenantId, bookingId, token }: { tenantId: string; bookingId: string; token: string }) =>
      `https://api.test/public/receipts/${tenantId}/${bookingId}/${token}/pdf`,
  },
}))

const RECEIPT: PublicReceipt = {
  number: 'RCT-BK-10001',
  companyName: 'Sunstate Car Co.',
  reference: 'BK-10001',
  renterName: 'Marisol Vega',
  vehicleName: 'Toyota Camry',
  pickupAt: '2026-10-01T13:30:00Z',
  returnAt: '2026-10-05T13:30:00Z',
  pickupLocation: 'Main Office',
  currency: 'USD',
  total: 319,
  received: 299,
  balance: 0,
  payments: [
    {
      kind: 'rental',
      method: 'Visa ·· 4242',
      amount: 319,
      refunded: 20,
      completedAt: '2026-10-01T09:00:00Z',
    },
  ],
}

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/receipt/t1/b1/token']}>
        <Routes>
          <Route path="/receipt/:tenantId/:bookingId/:token" element={<ReceiptPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('ReceiptPage', () => {
  it('lists what was paid, refunds netted, with the same PDF the counter gets', async () => {
    publicReceipt.mockResolvedValue(RECEIPT)
    renderPage()

    expect(await screen.findByText('RCT-BK-10001')).toBeInTheDocument()
    expect(screen.getByText('Sunstate Car Co.')).toBeInTheDocument()
    // The same car box as the payment page, pickup place included.
    expect(screen.getByText('· Main Office', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('$20 refunded')).toBeInTheDocument()
    expect(screen.getByText('$299')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Download PDF' })).toHaveAttribute(
      'href',
      'https://api.test/public/receipts/t1/b1/token/pdf',
    )
  })

  it('says what is still due when the rental is not settled', async () => {
    publicReceipt.mockResolvedValue({ ...RECEIPT, balance: 120 })
    renderPage()

    expect(await screen.findByText('$120 still due')).toBeInTheDocument()
  })

  it('tells the renter a wrong link is not valid, without retrying', async () => {
    publicReceipt.mockRejectedValue(
      new ApiError('not_found', 'This receipt link is not valid', { status: 404 }),
    )
    renderPage()

    expect(await screen.findByText("This receipt link isn't valid")).toBeInTheDocument()
    expect(publicReceipt).toHaveBeenCalledOnce()
  })
})
