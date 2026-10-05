import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type {
  ContractLink,
  PublicContract,
  SignatureInput,
} from '@/modules/contracts/types/booking-contract.types'
import { ApiError } from '@/types/api'
import { SignPage } from './SignPage'

const read = vi.fn<(link: ContractLink) => Promise<PublicContract>>()
const sign = vi.fn<(link: ContractLink, input: SignatureInput) => Promise<PublicContract>>()

vi.mock('@/modules/contracts/api/booking-contract.api', () => ({
  bookingContractApi: {
    public: (link: ContractLink) => read(link),
    publicSign: (link: ContractLink, input: SignatureInput) => sign(link, input),
    publicPdfUrl: (link: ContractLink) => `https://api.test/public/contracts/${link.contractId}/pdf`,
  },
}))

// jsdom has no canvas; the pad itself is exercised in a browser.
vi.mock('@/modules/contracts/components/SignaturePad', () => ({ SignaturePad: () => null }))

const OPEN: PublicContract = {
  companyName: 'Sunstate Car Co.',
  reference: 'BK-10001',
  number: 'AGR-BK-10001',
  renterName: 'Marisol Vega',
  status: 'open',
  sections: [{ title: 'Vehicle', rows: [{ label: 'Plate', value: 'ABC1234' }] }],
  charges: [{ label: 'Daily', detail: '4 × $55.00 per day', amount: '$220.00' }],
  totals: [{ label: 'Total', amount: '$235.40', strong: true }],
  terms: [
    { heading: true, text: '8. Mileage and fuel' },
    { heading: false, text: 'Return it full.\nOr pay for the fuel.' },
  ],
  companySignature: {
    company: 'Sunstate Car Company LLC',
    name: 'Edward Thomas',
    title: 'Owner',
    signature: 'data:image/png;base64,COMPANY',
    signed: 'Oct 5, 2026',
    issuedBy: 'Sam Staff',
  },
}
const SIGNED: PublicContract = {
  ...OPEN,
  status: 'signed',
  signedAt: '2026-10-05T19:42:00Z',
  signerName: 'Marisol Vega',
}

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/sign/t1/c1/tok']}>
        <Routes>
          <Route path="/sign/:tenantId/:contractId/:token" element={<SignPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  read.mockReset()
  sign.mockReset()
})

describe('SignPage', () => {
  it('shows the rental and the terms, takes a typed signature, and becomes the signed copy', async () => {
    read.mockResolvedValue(OPEN)
    sign.mockResolvedValue(SIGNED)
    const user = userEvent.setup({ delay: null })
    renderPage()

    expect(await screen.findByRole('heading', { name: '8. Mileage and fuel' })).toBeInTheDocument()
    expect(screen.getByText('ABC1234')).toBeInTheDocument()
    expect(screen.getByText('$235.40')).toBeInTheDocument()
    expect(read).toHaveBeenCalledWith({ tenantId: 't1', contractId: 'c1', token: 'tok' })
    // Already signed for the company, and said by whom and on whose issue.
    expect(screen.getByRole('img', { name: 'Signature of Edward Thomas' })).toHaveAttribute(
      'src',
      'data:image/png;base64,COMPANY',
    )
    expect(screen.getByText('Edward Thomas, Owner')).toBeInTheDocument()
    expect(screen.getByText('Sunstate Car Company LLC · Signed Oct 5, 2026')).toBeInTheDocument()
    expect(screen.getByText('Applied when issued by Sam Staff')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Use my typed name as my signature instead' }))
    await user.click(screen.getByRole('checkbox', { name: /I have read this rental agreement/ }))
    await user.click(screen.getByRole('button', { name: 'Sign agreement' }))

    await waitFor(() =>
      expect(sign).toHaveBeenCalledWith(
        { tenantId: 't1', contractId: 'c1', token: 'tok' },
        { signerName: 'Marisol Vega', signature: undefined },
      ),
    )
    const signed = await screen.findByRole('heading', { name: 'Agreement signed' })
    expect(screen.queryByRole('button', { name: 'Sign agreement' })).not.toBeInTheDocument()
    // The confirmation takes the form's place at the foot, where the renter has just signed.
    const terms = screen.getByRole('heading', { name: '8. Mileage and fuel' })
    expect(terms.compareDocumentPosition(signed) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // Offered at the top too, for someone opening the link later only to fetch their copy.
    const downloads = screen.getAllByRole('link', { name: 'Download your copy' })
    expect(downloads.map((link) => link.getAttribute('href'))).toEqual([
      'https://api.test/public/contracts/c1/pdf',
      'https://api.test/public/contracts/c1/pdf',
    ])
    expect(downloads[0].compareDocumentPosition(terms) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('says a replaced agreement was replaced, and shows none of it', async () => {
    read.mockResolvedValue({ ...OPEN, status: 'replaced', sections: [], charges: [], totals: [], terms: [] })
    renderPage()

    expect(await screen.findByRole('heading', { name: 'This agreement was replaced' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign agreement' })).not.toBeInTheDocument()
  })

  it('calls a link the API does not know not valid, without offering a retry', async () => {
    read.mockRejectedValue(new ApiError('not_found', 'This agreement link is not valid', { status: 404 }))
    renderPage()

    expect(await screen.findByRole('heading', { name: 'This link is not valid' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('offers a retry when the agreement could not be reached', async () => {
    read.mockRejectedValue(new ApiError('server_error', 'Server error', { status: 503 }))
    renderPage()

    expect(await screen.findByRole('button', { name: 'Try again' }, { timeout: 4000 })).toBeInTheDocument()
  })
})
