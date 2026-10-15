import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { Company } from '../types/company.types'
import { AdditionalDriverCard } from './AdditionalDriverCard'

const setPrice = vi.fn<(price: number) => Promise<Company>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))
vi.mock('../api/company.api', () => ({
  companyApi: { setAdditionalDriverPrice: (price: number) => setPrice(price) },
}))

const COMPANY: Company = {
  id: 't_1',
  name: 'Sunstate Car Co.',
  subdomain: 'sunstate',
  fleetSize: '11_50',
  country: 'US',
  currencyLocked: false,
  timezone: 'America/New_York',
  currency: 'USD',
  listingLanguage: 'en',
  additionalDriverPrice: 12,
}

function renderCard() {
  setPrice.mockImplementation(async (price) => ({ ...COMPANY, additionalDriverPrice: price }))
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AdditionalDriverCard company={COMPANY} />
    </QueryClientProvider>,
  )
  return userEvent.setup({ delay: null })
}

const field = () => screen.getByLabelText('Price per driver')
const save = () => screen.getByRole('button', { name: 'Save changes' })

afterEach(() => setPrice.mockReset())

describe('AdditionalDriverCard', () => {
  it('starts on the saved price, with nothing to save', () => {
    renderCard()

    expect(field()).toHaveValue(12)
    expect(save()).toBeDisabled()
  })

  it('saves a new price, free included', async () => {
    const user = renderCard()

    await user.clear(field())
    await user.type(field(), '0')
    await user.click(save())

    await waitFor(() => expect(setPrice).toHaveBeenCalledWith(0))
  })

  it('refuses a price below zero or finer than a cent', async () => {
    const user = renderCard()

    for (const typed of ['-5', '9.999']) {
      await user.clear(field())
      await user.type(field(), typed)
      await user.click(save())
      expect(await screen.findByText('Enter an amount of 0 or more, to the cent.')).toBeInTheDocument()
    }
    expect(setPrice).not.toHaveBeenCalled()
  })
})
