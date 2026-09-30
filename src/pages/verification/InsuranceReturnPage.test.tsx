import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { InsuranceMessage } from '@/modules/bookings/hooks/use-verification'

const auth = { isSignedIn: false }
let shown: InsuranceMessage | undefined

vi.mock('@clerk/clerk-react', () => ({ useAuth: () => auth }))
vi.mock('@/modules/bookings/hooks/use-verification', () => ({
  useInsuranceReturn: () => shown,
}))

const { InsuranceReturnPage } = await import('./InsuranceReturnPage')

function renderPage(message: InsuranceMessage | undefined, signedIn = false) {
  shown = message
  auth.isSignedIn = signedIn
  render(
    <MemoryRouter>
      <InsuranceReturnPage />
    </MemoryRouter>,
  )
}

describe('the page a renter returns to', () => {
  it('thanks the renter without telling them the verdict', () => {
    // Cover that falls short is for the rental company to raise, not a page to break it on.
    renderPage({ type: 'finished', outcome: { verificationId: 'v1', status: 'consider' } })

    expect(screen.getByRole('heading')).toHaveTextContent('Your insurance is connected')
    expect(screen.queryByText(/review|covered|policy/i)).not.toBeInTheDocument()
  })

  it('offers a renter no way into the app', () => {
    renderPage({ type: 'unfinished' })

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('takes staff back, when their own tab landed here because the popup was blocked', () => {
    renderPage({ type: 'finished', outcome: { verificationId: 'v1', status: 'clear' } }, true)

    expect(screen.getByRole('link', { name: 'Back to Veltrio' })).toBeInTheDocument()
  })

  it('says it is still working until there is an outcome', () => {
    renderPage(undefined)

    expect(screen.getByText('Finishing the insurance check…')).toBeInTheDocument()
  })
})
