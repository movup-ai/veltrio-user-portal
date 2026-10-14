import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useOrganizationStore } from '@/state/organization.store'
import type { Billing, BillingHistory, PlanChoice } from '../types/billing.types'
import { checkoutLinks } from '../utils/billing.utils'
import { BillingSettings } from './BillingSettings'

const get = vi.fn<() => Promise<Billing>>()
const history = vi.fn<() => Promise<BillingHistory>>()
const refresh = vi.fn<() => Promise<Billing>>()
const changePlan = vi.fn<(choice: PlanChoice) => Promise<Billing>>()
const checkoutLink = vi.fn<(checkout: unknown) => Promise<string>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))

vi.mock('../api/billing.api', () => ({
  billingApi: {
    get: () => get(),
    refresh: () => refresh(),
    changePlan: (choice: PlanChoice) => changePlan(choice),
    checkoutLink: (checkout: unknown) => checkoutLink(checkout),
    history: () => history(),
  },
}))

const NO_PLAN: Billing = {
  enabled: true,
  active: false,
  cancelAtPeriodEnd: false,
  trialAvailable: true,
  trialDays: 7,
  vehicles: 0,
  branches: 1,
  currency: 'USD',
  yearlyDiscountPercent: 15,
  plans: [
    { plan: 'starter', maxVehicles: 5, maxBranches: 1, monthly: 39, yearly: 399 },
    { plan: 'growth', maxVehicles: 20, maxBranches: 3, monthly: 99, yearly: 999 },
    { plan: 'pro', maxVehicles: 50, monthly: 199, yearly: 1999 },
    { plan: 'enterprise' },
  ],
  credits: {
    balance: 5,
    costs: { background: 2, insurance: 5 },
    packs: [
      { key: 'small', credits: 25, price: 25 },
      { key: 'medium', credits: 60, price: 54 },
      { key: 'large', credits: 150, price: 120 },
    ],
    lowBalance: 10,
  },
}

const ON_GROWTH: Billing = {
  ...NO_PLAN,
  active: true,
  plan: 'growth',
  interval: 'month',
  status: 'active',
  periodEnd: '2026-11-08T09:00:00Z',
  trialAvailable: false,
  vehicles: 8,
  branches: 2,
  maxVehicles: 20,
  maxBranches: 3,
}

function renderAs(role: 'owner' | 'manager', path = '/settings/billing') {
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
        {/* Mounted app-wide; without the wait a hover would need a real timer to open one. */}
        <TooltipProvider delayDuration={0}>
          <BillingSettings />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** The card for one plan, found by its heading. */
async function plan(name: string) {
  const heading = await screen.findByRole('heading', { name, level: 3 })
  return within(heading.closest('li') as HTMLElement)
}

beforeEach(() => {
  history.mockResolvedValue({ charges: [], hasMore: false })
})

afterEach(() => {
  get.mockReset()
  history.mockReset()
  refresh.mockReset()
  changePlan.mockReset()
  checkoutLink.mockReset()
  useOrganizationStore.setState({ membership: null })
})

describe('BillingSettings', () => {
  it('starts a new company on the plan and period it picked, with the free trial', async () => {
    get.mockResolvedValue(NO_PLAN)
    // Never answered: the page would leave for Stripe, which jsdom cannot do.
    checkoutLink.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    // By its text: the loading state is a status too, and would be found first.
    expect(await screen.findByText(/start your 7-day free trial/)).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /Yearly/ }))
    const growth = await plan('Growth')
    // The yearly price as it is charged, not broken down into months.
    expect(growth.getByRole('heading').closest('li')).toHaveTextContent('$999 / year')
    expect(growth.queryByText(/month/)).not.toBeInTheDocument()
    await user.click(growth.getByRole('button', { name: 'Start free trial' }))

    expect(checkoutLink).toHaveBeenCalledWith({
      plan: 'growth',
      interval: 'year',
      ...checkoutLinks(window.location.origin),
    })
  })

  it('shows anyone else the plans without a way to choose one', async () => {
    get.mockResolvedValue(NO_PLAN)
    renderAs('manager')

    expect(
      await screen.findByText('Only the account owner can choose or change the plan.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start free trial' })).not.toBeInTheDocument()
    expect((await plan('Starter')).getByText('Up to 5 vehicles')).toBeInTheDocument()
  })

  it('will not offer a plan the fleet does not fit, and says why', async () => {
    get.mockResolvedValue(ON_GROWTH)
    renderAs('owner')

    const starter = await plan('Starter')
    // A smaller plan than the one the company is on is a downgrade, and is called one.
    const refused = starter.getByRole('button', { name: 'Downgrade' })
    expect(refused).toBeDisabled()
    // The reason sits on the limit it is about, and is what the disabled button is described by.
    expect(starter.getByText('Up to 5 vehicles').closest('li')).toHaveTextContent('you have 8')
    expect(refused).toHaveAccessibleDescription(/Up to 5 vehicles.*you have 8/)
    expect((await plan('Growth')).getByRole('button', { name: 'Current plan' })).toBeDisabled()
  })

  it('says on hover why a plan the fleet does not fit cannot be chosen', async () => {
    get.mockResolvedValue({ ...ON_GROWTH, vehicles: 5 })
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    const refused = (await plan('Starter')).getByRole('button', { name: 'Downgrade' })
    // A disabled button fires no hover of its own, so the tooltip opens from the span around it.
    await user.hover(refused.parentElement as HTMLElement)
    expect(await screen.findByRole('tooltip')).toHaveTextContent('You have 2 branches. Starter allows 1.')

    // A plan that can be chosen has nothing to explain.
    await user.hover((await plan('Pro')).getByRole('button', { name: 'Upgrade' }))
    expect(screen.queryByText(/Pro allows/)).not.toBeInTheDocument()
  })

  it('switches plan only after the owner confirms', async () => {
    get.mockResolvedValue(ON_GROWTH)
    changePlan.mockResolvedValue({ ...ON_GROWTH, plan: 'pro', maxVehicles: 50, maxBranches: undefined })
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    await user.click((await plan('Pro')).getByRole('button', { name: 'Upgrade' }))
    expect(changePlan).not.toHaveBeenCalled()
    expect(within(screen.getByRole('dialog')).getByRole('heading')).toHaveTextContent('Upgrade to Pro?')
    // What is being agreed to is on the dialog itself, not only on the card behind it.
    expect(screen.getByRole('dialog')).toHaveTextContent('Pro costs $199, billed monthly.')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Upgrade' }))

    await waitFor(() => expect(changePlan).toHaveBeenCalledWith({ plan: 'pro', interval: 'month' }))
    expect(await (await plan('Pro')).findByRole('button', { name: 'Current plan' })).toBeDisabled()
  })

  it('offers the current plan on the other billing period as a switch', async () => {
    get.mockResolvedValue(ON_GROWTH)
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    await user.click(await screen.findByRole('tab', { name: /Yearly/ }))

    // Same plan, other period: neither an upgrade nor a downgrade, so it says what it does.
    expect((await plan('Growth')).getByRole('button', { name: 'Switch to yearly' })).toBeEnabled()
    expect((await plan('Pro')).getByRole('button', { name: 'Upgrade' })).toBeEnabled()
  })

  it('reads the subscription from Stripe when the owner comes back from checkout', async () => {
    // The page loads before the event that reports the subscription has arrived.
    get.mockResolvedValue(NO_PLAN)
    refresh.mockResolvedValue({ ...ON_GROWTH, status: 'trialing' })
    renderAs('owner', '/settings/billing?checkout=done')

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce())
    expect(await screen.findByText('Free trial')).toBeInTheDocument()
    expect(screen.getByText(/Your free trial ends on/)).toBeInTheDocument()
  })

  it('says billing is off, and offers nothing, where the deployment does not bill', async () => {
    get.mockResolvedValue({ ...NO_PLAN, enabled: false, active: true })
    renderAs('owner')

    expect(await screen.findByText(/Billing isn't switched on/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Starter', level: 3 })).not.toBeInTheDocument()
  })
})

describe('BillingSettings after the review', () => {
  it('opens the picker on the period the company pays by, once that is known', async () => {
    // Back from checkout the page first loads with no plan; the picker used to stay on Monthly,
    // offering the yearly plan just bought as a switch to monthly.
    get.mockResolvedValue(NO_PLAN)
    let subscribed: (billing: Billing) => void = () => {}
    refresh.mockReturnValue(new Promise((resolve) => (subscribed = resolve)))
    renderAs('owner', '/settings/billing?checkout=done')
    // Nothing is offered until Stripe has answered: the plan just bought is not known yet.
    await waitFor(() => expect(get).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.queryAllByRole('button', { name: 'Start free trial' })).toHaveLength(0)

    subscribed({ ...ON_GROWTH, interval: 'year' })

    expect(await (await plan('Growth')).findByRole('button', { name: 'Current plan' })).toBeDisabled()
    expect(screen.getByRole('tab', { name: /Yearly/ })).toHaveAttribute('aria-selected', 'true')
  })

  it("reads the subscription again when the owner comes back from Stripe's portal", async () => {
    get.mockResolvedValue(ON_GROWTH)
    refresh.mockResolvedValue({ ...ON_GROWTH, cancelAtPeriodEnd: true })
    renderAs('owner', '/settings/billing?portal=done')

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce())
    expect(await screen.findByText('Ending')).toBeInTheDocument()
  })

  it('offers no other plan while the page is leaving for checkout', async () => {
    get.mockResolvedValue(NO_PLAN)
    checkoutLink.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    await user.click((await plan('Growth')).getByRole('button', { name: 'Start free trial' }))

    expect((await plan('Starter')).getByRole('button', { name: 'Start free trial' })).toBeDisabled()
    expect((await plan('Pro')).getByRole('button', { name: 'Start free trial' })).toBeDisabled()
  })

  it('offers no plan to buy while Stripe is holding the subscription for a payment', async () => {
    get.mockResolvedValue({ ...ON_GROWTH, active: false, status: 'unpaid' })
    renderAs('owner')

    expect(await screen.findByText('On hold')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manage billing' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Choose plan' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Upgrade' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Downgrade' })).not.toBeInTheDocument()
  })
})

describe('plan cards', () => {
  it('say what every plan includes, under the limits that tell the plans apart', async () => {
    get.mockResolvedValue(NO_PLAN)
    renderAs('owner')

    const starter = await plan('Starter')
    expect(starter.getByText('Up to 5 vehicles')).toBeInTheDocument()
    expect(starter.getByText('E-signed rental agreements')).toBeInTheDocument()
    expect(starter.getByText('Verification suite')).toBeInTheDocument()
    expect((await plan('Pro')).getByText('Branded booking website')).toBeInTheDocument()
    expect(starter.queryByText('Card payments & deposits')).not.toBeInTheDocument()
  })

  it('describe Enterprise by what it adds, sized from the largest plan on sale', async () => {
    get.mockResolvedValue(NO_PLAN)
    renderAs('owner')

    const enterprise = await plan('Enterprise')
    expect(enterprise.getByText('More than 50 vehicles')).toBeInTheDocument()
    expect(enterprise.getByText('Everything in Pro')).toBeInTheDocument()
    expect(enterprise.queryByText('E-signed rental agreements')).not.toBeInTheDocument()
  })
})

describe('current plan summary', () => {
  it('says what the plan costs, when it renews and how much room is left', async () => {
    get.mockResolvedValue(ON_GROWTH)
    renderAs('owner')

    const summary = within(await screen.findByRole('group', { name: 'Your plan' }))
    expect(summary.getByText('$99 / month')).toBeInTheDocument()
    expect(summary.getByText('Renews on Nov 8, 2026')).toBeInTheDocument()
    const vehicles = summary.getByRole('meter', { name: 'Vehicles' })
    expect(vehicles).toHaveAttribute('aria-valuenow', '8')
    expect(vehicles).toHaveAttribute('aria-valuemax', '20')
    expect(summary.getByText('8 of 20')).toBeInTheDocument()
    // Cancelling lives behind this button, so the page says so.
    expect(summary.getByText('Update your card, see invoices or cancel')).toBeInTheDocument()
  })

  it('shows a fleet with no limit as a count, with no bar to fill', async () => {
    get.mockResolvedValue({ ...ON_GROWTH, plan: 'pro', maxVehicles: 50, maxBranches: undefined })
    renderAs('owner')

    const summary = within(await screen.findByRole('group', { name: 'Your plan' }))
    expect(summary.queryByRole('meter', { name: 'Branches' })).not.toBeInTheDocument()
    expect(summary.getByText('2, no limit')).toBeInTheDocument()
  })
})

describe('current plan summary without a plan', () => {
  it('counts the fleet without claiming it has no limit', async () => {
    // No plan sets no limit, but "no limit" would read as a promise the company does not have.
    get.mockResolvedValue({ ...NO_PLAN, vehicles: 5 })
    renderAs('owner')

    const summary = within(await screen.findByRole('group', { name: 'Your plan' }))
    expect(summary.getByText('Vehicles').parentElement).toHaveTextContent('Vehicles5')
    expect(summary.queryByText(/no limit/)).not.toBeInTheDocument()
  })
})

describe('billing history', () => {
  it('is shown to the owner, under the plan and the credits', async () => {
    get.mockResolvedValue(ON_GROWTH)
    renderAs('owner')

    expect(await screen.findByText('No charges yet')).toBeInTheDocument()
  })

  it('is neither shown to nor asked for by anyone else, whom the API would refuse', async () => {
    get.mockResolvedValue(ON_GROWTH)
    renderAs('manager')

    await plan('Growth')
    expect(screen.queryByRole('heading', { name: 'Billing history' })).not.toBeInTheDocument()
    expect(history).not.toHaveBeenCalled()
  })
})
