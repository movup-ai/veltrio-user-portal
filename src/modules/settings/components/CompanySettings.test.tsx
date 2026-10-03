import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { useOrganizationStore } from '@/state/organization.store'
import { ApiError } from '@/types/api'
import type { Company, CompanyPatch } from '../types/company.types'
import { CompanySettings } from './CompanySettings'

const get = vi.fn<() => Promise<Company>>()
const update = vi.fn<(patch: CompanyPatch) => Promise<Company>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))

vi.mock('../api/company.api', () => ({
  companyApi: { get: () => get(), update: (patch: CompanyPatch) => update(patch) },
}))

const COMPANY: Company = {
  id: 't_1',
  name: 'Sunstate Car Co.',
  subdomain: 'sunstate',
  website: 'https://sunstate.com',
  fleetSize: '11_50',
  country: 'US',
  currencyLocked: false,
  timezone: 'America/New_York',
  currency: 'USD',
  contactEmail: 'hello@sunstate.com',
}

function renderAs(role: 'owner' | 'manager') {
  useOrganizationStore.setState({
    membership: {
      organizationId: 't_1',
      organizationName: 'Sunstate Car Co.',
      subdomain: 'sunstate',
      currency: 'USD',
      role,
      permissions: role === 'owner' ? ['settings.manage'] : [],
    },
  })
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <CompanySettings />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function card(title: string) {
  return screen.getByRole('heading', { name: title }).closest('section') as HTMLElement
}

afterEach(() => {
  get.mockReset()
  update.mockReset()
  useOrganizationStore.setState({ membership: null })
})

describe('CompanySettings', () => {
  it("saves only the edited card's changed fields", async () => {
    get.mockResolvedValue(COMPANY)
    update.mockImplementation(async (patch) => ({ ...COMPANY, ...patch }))
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    const name = await screen.findByLabelText(/Company name/)
    const company = card('Company')
    const save = within(company).getByRole('button', { name: 'Save changes' })
    expect(save).toBeDisabled()

    await user.clear(name)
    await user.type(name, 'Sunstate Rentals')
    await user.click(save)

    await waitFor(() => expect(update).toHaveBeenCalledWith({ name: 'Sunstate Rentals' }))
    // Saved values become the new baseline, so the card is clean again.
    await waitFor(() => expect(save).toBeDisabled())
  })

  it('discards edits back to the saved values', async () => {
    get.mockResolvedValue(COMPANY)
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    const email = await screen.findByLabelText('Email')
    await user.clear(email)
    await user.type(email, 'other@sunstate.com')
    await user.click(within(card('Contact')).getByRole('button', { name: 'Discard' }))

    expect(email).toHaveValue('hello@sunstate.com')
  })

  it('blocks a link from the wrong network before it reaches the API', async () => {
    get.mockResolvedValue(COMPANY)
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    await user.type(await screen.findByLabelText('Instagram'), 'facebook.com/sunstate')
    await user.click(within(card('Social links')).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Enter a profile link on instagram.com')).toBeInTheDocument()
    expect(update).not.toHaveBeenCalled()
  })

  it("places the API's field error under the field it names", async () => {
    get.mockResolvedValue(COMPANY)
    update.mockRejectedValue(
      new ApiError('validation', 'Request validation failed', {
        status: 422,
        fieldErrors: [{ field: 'contactPhone', message: 'String should have at most 25 characters' }],
      }),
    )
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    await user.type(await screen.findByLabelText('Phone'), '+1 305 555 0100')
    await user.click(within(card('Contact')).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('String should have at most 25 characters')).toBeInTheDocument()
  })

  it('saves a newly chosen currency, with the country free to change too', async () => {
    get.mockResolvedValue(COMPANY)
    update.mockImplementation(async (patch) => ({ ...COMPANY, ...patch }))
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    expect(await screen.findByRole('combobox', { name: /Country/ })).toBeEnabled()
    expect(screen.getByRole('combobox', { name: /Currency/ })).toHaveTextContent('USD — US Dollar')
    await user.click(screen.getByRole('combobox', { name: /Currency/ }))
    await user.click(await screen.findByRole('option', { name: 'EUR — Euro' }))
    await user.click(within(card('Localization')).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(update).toHaveBeenCalledWith({ currency: 'EUR' }))
  })

  it('locks the currency once bookings exist, and says why', async () => {
    get.mockResolvedValue({ ...COMPANY, currency: 'EUR', currencyLocked: true })
    renderAs('owner')

    const currency = await screen.findByRole('combobox', { name: /Currency/ })
    expect(currency).toBeDisabled()
    expect(currency).toHaveTextContent('EUR — Euro')
    expect(screen.getByText(/Can't be changed once you have bookings/)).toBeInTheDocument()
  })

  it('still renders when the API sends no currency', async () => {
    // An API build older than the field omits it; Intl.DisplayNames threw and took the page down.
    get.mockResolvedValue({ ...COMPANY, currency: undefined as unknown as string })
    renderAs('owner')

    expect(await screen.findByRole('combobox', { name: /Currency/ })).toBeInTheDocument()
    expect(screen.getByLabelText(/Company name/)).toHaveValue('Sunstate Car Co.')
  })

  it('opens the company site itself, not its vehicle list', async () => {
    get.mockResolvedValue(COMPANY)
    renderAs('owner')

    const link = await screen.findByRole('link', { name: 'Open your fleet site' })
    expect(link.getAttribute('href')).toMatch(/^https:\/\/sunstate\.[^/]+$/)
  })

  it("saves the company's address as typed, not a location's", async () => {
    get.mockResolvedValue(COMPANY)
    update.mockImplementation(async (patch) => ({ ...COMPANY, ...patch }))
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    await user.type(await screen.findByLabelText('Address'), '1440 Collins Ave, Miami Beach, FL')
    await user.click(within(card('Contact')).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(update).toHaveBeenCalledWith({ address: '1440 Collins Ave, Miami Beach, FL' }))
  })

  it('tells a non-owner who can change settings, without asking the API', () => {
    renderAs('manager')

    expect(screen.getByText('Only the owner can change company settings')).toBeInTheDocument()
    expect(get).not.toHaveBeenCalled()
  })
})
