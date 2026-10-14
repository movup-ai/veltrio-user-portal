import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { useOrganizationStore } from '@/state/organization.store'
import type { AutoRecharge, Billing } from '../types/billing.types'
import { packCheckoutLinks } from '../utils/billing.utils'
import { CreditsCard } from './CreditsCard'

const packCheckoutLink = vi.fn<(checkout: unknown) => Promise<string>>()
const confirmPack = vi.fn<(checkoutId: string) => Promise<Billing>>()
const setAutoRecharge = vi.fn<(setting: AutoRecharge | undefined) => Promise<Billing>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))

vi.mock('../api/billing.api', () => ({
  billingApi: {
    packCheckoutLink: (checkout: unknown) => packCheckoutLink(checkout),
    confirmPack: (checkoutId: string) => confirmPack(checkoutId),
    setAutoRecharge: (setting: AutoRecharge | undefined) => setAutoRecharge(setting),
  },
}))

const BILLING: Billing = {
  enabled: true,
  active: true,
  plan: 'growth',
  interval: 'month',
  status: 'active',
  cancelAtPeriodEnd: false,
  trialAvailable: false,
  trialDays: 7,
  vehicles: 8,
  branches: 2,
  maxVehicles: 20,
  maxBranches: 3,
  currency: 'USD',
  yearlyDiscountPercent: 15,
  plans: [],
  credits: {
    balance: 30,
    costs: { background: 2, insurance: 5 },
    packs: [
      { key: 'small', credits: 30, price: 45 },
      { key: 'medium', credits: 60, price: 80 },
      { key: 'large', credits: 150, price: 180 },
    ],
    lowBalance: 10,
  },
}

function withCredits(credits: Partial<Billing['credits']>): Billing {
  return { ...BILLING, credits: { ...BILLING.credits, ...credits } }
}

function renderAs(role: 'owner' | 'manager', billing = BILLING, path = '/settings/billing') {
  useOrganizationStore.setState({
    membership: {
      organizationId: 'org_1',
      organizationName: 'Test Org',
      subdomain: 'test-org',

      currency: 'USD',
      role,
      permissions: role === 'owner' ? ['settings.manage'] : [],
    },
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <CreditsCard billing={billing} canManage={role === 'owner'} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  packCheckoutLink.mockReset()
  confirmPack.mockReset()
  setAutoRecharge.mockReset()
  useOrganizationStore.setState({ membership: null })
})

describe('CreditsCard', () => {
  it('shows the balance, with what each check costs under it', () => {
    renderAs('owner')

    const balance = screen.getByRole('group', { name: 'Credits left' })
    expect(within(balance).getByText('30')).toBeInTheDocument()
    // Under the number rather than beside it: the costs are what the number is spent on.
    const costs = within(within(balance).getByRole('list', { name: 'What a check costs' }))
    expect(costs.getByText('Background check: 2 credits')).toBeInTheDocument()
    expect(costs.getByText('Insurance check: 5 credits')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('sends the owner to checkout for the pack they picked', async () => {
    // Never answered: the page would leave for Stripe, which jsdom cannot do.
    packCheckoutLink.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    await user.click(screen.getByRole('button', { name: 'Buy credits' }))
    const dialog = within(screen.getByRole('dialog'))
    // $80 for 60 credits is a third of a cent over $1.33; the price is shown to the cent.
    for (const each of ['$1.50', '$1.33', '$1.20']) {
      expect(dialog.getByText(`${each} a credit`)).toBeInTheDocument()
    }
    await user.click(dialog.getByRole('radio', { name: /150 credits/ }))
    await user.click(dialog.getByRole('button', { name: 'Continue to payment' }))

    expect(packCheckoutLink).toHaveBeenCalledWith({
      pack: 'large',
      ...packCheckoutLinks(window.location.origin),
    })
  })

  it('adds the credits of the checkout the owner has just come back from', async () => {
    confirmPack.mockResolvedValue(withCredits({ balance: 90 }))
    renderAs('owner', BILLING, '/settings/billing?credits=cs_test_9')

    await waitFor(() => expect(confirmPack).toHaveBeenCalledWith('cs_test_9'))
    expect(confirmPack).toHaveBeenCalledOnce()
  })

  it('saves auto-recharge with the pack and the balance chosen', async () => {
    setAutoRecharge.mockResolvedValue(withCredits({ autoRecharge: { pack: 'small', below: 10 } }))
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    expect(screen.getByText('Off')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Set up' }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('switch', { name: 'Top up automatically' }))
    await user.click(dialog.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(setAutoRecharge).toHaveBeenCalledWith({ pack: 'small', below: 10 }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('switches auto-recharge off by sending nothing to buy', async () => {
    const on = withCredits({ autoRecharge: { pack: 'medium', below: 20 } })
    setAutoRecharge.mockResolvedValue(BILLING)
    const user = userEvent.setup({ delay: null })
    renderAs('owner', on)

    expect(screen.getByText('Buys 60 credits when fewer than 20 are left')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Change' }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('switch', { name: 'Top up automatically' }))
    await user.click(dialog.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(setAutoRecharge).toHaveBeenCalledWith(undefined))
  })

  it('warns when the balance is low, and says so plainly when a check cannot be run', () => {
    renderAs('owner', withCredits({ balance: 6 }))
    expect(screen.getByRole('status')).toHaveTextContent('Running low')
  })

  it('says a check cannot be run when the balance will not cover the cheapest one', () => {
    renderAs('owner', withCredits({ balance: 1 }))
    expect(screen.getByRole('status')).toHaveTextContent('Not enough credits to run a check')
  })

  it('shows anyone else the balance, with no way to buy', () => {
    renderAs('manager')

    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('Only the account owner can buy credits.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Buy credits' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Set up' })).not.toBeInTheDocument()
  })

  it('will not sell credits to a company with no plan', () => {
    renderAs('owner', { ...BILLING, active: false, plan: undefined, status: undefined })

    expect(screen.getByRole('button', { name: 'Buy credits' })).toBeDisabled()
    expect(screen.getByText('Choose a plan before buying credits.')).toBeInTheDocument()
  })
})

describe('CreditsCard after the review', () => {
  it('says so, with the price, when saving auto-recharge will buy a pack at once', async () => {
    const user = userEvent.setup({ delay: null })
    renderAs('owner', withCredits({ balance: 5 }))

    await user.click(screen.getByRole('button', { name: 'Set up' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.queryByRole('alert')).not.toBeInTheDocument()
    await user.click(dialog.getByRole('switch', { name: 'Top up automatically' }))

    // 5 credits is under the 10 offered by default, so the first pack is bought on saving.
    expect(dialog.getByRole('alert')).toHaveTextContent('$45')
    expect(dialog.getByRole('alert')).toHaveTextContent('as soon as you save')
  })

  it('gives no such warning when the balance is above the line', async () => {
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    await user.click(screen.getByRole('button', { name: 'Set up' }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('switch', { name: 'Top up automatically' }))

    expect(dialog.queryByRole('alert')).not.toBeInTheDocument()
  })
})
