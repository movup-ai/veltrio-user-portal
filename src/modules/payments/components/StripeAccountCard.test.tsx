import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { useOrganizationStore } from '@/state/organization.store'
import type { CheckoutMethodStatus, PaymentAccount } from '../types/payment-account.types'
import { methodsScope, recallMethods, rememberMethods } from '../utils/checkout-methods.memory'
import { onboardingLinks } from '../utils/payment-account.utils'
import { StripeAccountCard } from './StripeAccountCard'

const account = vi.fn<() => Promise<PaymentAccount>>()
const disconnect = vi.fn<() => Promise<PaymentAccount>>()
const methods = vi.fn<() => Promise<CheckoutMethodStatus[]>>()
const newAccountLink = vi.fn<(links: unknown) => Promise<string>>()
const enableMethod = vi.fn<(method: string) => Promise<CheckoutMethodStatus[]>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))

vi.mock('../api/payment.api', () => ({
  paymentApi: {
    account: () => account(),
    disconnect: () => disconnect(),
    methods: () => methods(),
    enableMethod: (method: string) => enableMethod(method),
    newAccountLink: (links: unknown) => newAccountLink(links),
  },
}))

function renderAs(role: 'owner' | 'manager') {
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
      <MemoryRouter>
        <StripeAccountCard />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  account.mockReset()
  disconnect.mockReset()
  methods.mockReset()
  enableMethod.mockReset()
  newAccountLink.mockReset()
  useOrganizationStore.setState({ membership: null })
  localStorage.clear()
})

describe('StripeAccountCard', () => {
  it('shows the connect button, disabled with a reason, when the server has no Stripe key', async () => {
    // The button was hidden here, so an owner saw no way in and no reason why.
    account.mockResolvedValue({ available: false, connected: false, disconnected: false })
    renderAs('owner')

    expect(await screen.findByRole('button', { name: 'Connect Stripe' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent("Stripe isn't configured on the server yet")
  })

  it('lets the owner connect once Stripe is configured', async () => {
    account.mockResolvedValue({ available: true, connected: false, disconnected: false })
    renderAs('owner')

    expect(await screen.findByRole('button', { name: 'Connect Stripe' })).toBeEnabled()
  })

  it('tells anyone else the owner connects', async () => {
    account.mockResolvedValue({ available: true, connected: false, disconnected: false })
    renderAs('manager')

    expect(await screen.findByText(/Only the account owner/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Connect Stripe' })).not.toBeInTheDocument()
  })

  it('disconnects an active account only after the owner confirms', async () => {
    const active: PaymentAccount = {
      available: true,
      connected: true,
      disconnected: false,
      cardPayments: 'active',
      payouts: 'active',
    }
    account.mockResolvedValue(active)
    disconnect.mockResolvedValue({ ...active, connected: false, disconnected: true })
    methods.mockResolvedValue([])
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    await user.click(await screen.findByRole('button', { name: 'Disconnect' }))
    expect(disconnect).not.toHaveBeenCalled()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Disconnect' }))

    await waitFor(() => expect(disconnect).toHaveBeenCalledOnce())
    expect(await screen.findByRole('button', { name: 'Reconnect' })).toBeEnabled()
  })

  it('lets the owner switch on a wallet that is off', async () => {
    account.mockResolvedValue({
      available: true,
      connected: true,
      disconnected: false,
      cardPayments: 'active',
      payouts: 'active',
    })
    const off: CheckoutMethodStatus[] = [
      { type: 'card', available: true },
      { type: 'apple_pay', available: true },
      { type: 'google_pay', available: false },
      { type: 'link', available: true },
    ]
    methods.mockResolvedValue(off)
    enableMethod.mockResolvedValue(off.map((m) => ({ ...m, available: true })))
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    // Only the method that is off offers to be turned on.
    await user.click(await screen.findByRole('button', { name: 'Turn on' }))

    await waitFor(() => expect(enableMethod).toHaveBeenCalledWith('google_pay'))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Turn on' })).not.toBeInTheDocument())
  })

  it('shows what the account accepted last time at once, while Stripe is asked again', async () => {
    const linked = '2026-10-02T12:00:00Z'
    const lastTime: CheckoutMethodStatus[] = [
      { type: 'card', available: true },
      { type: 'apple_pay', available: true },
      { type: 'google_pay', available: false },
    ]
    rememberMethods(methodsScope('org_1', linked), lastTime)
    account.mockResolvedValue({
      available: true,
      connected: true,
      disconnected: false,
      cardPayments: 'active',
      payouts: 'active',
      connectedAt: linked,
    })
    let answer: (methods: CheckoutMethodStatus[]) => void = () => {}
    methods.mockReturnValue(new Promise((resolve) => (answer = resolve)))
    renderAs('owner')

    // Stripe has not answered, and the row is already there.
    expect(await screen.findByText('Apple Pay')).toBeInTheDocument()
    // Remembered is not confirmed: nothing is switched on from a list that may be out of date.
    expect(screen.getByRole('button', { name: 'Turn on' })).toBeDisabled()

    await act(async () => answer(lastTime.map((method) => ({ ...method, available: true }))))

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Turn on' })).not.toBeInTheDocument())
    // What Stripe said is what the next visit starts from.
    expect(recallMethods(methodsScope('org_1', linked))?.every((method) => method.available)).toBe(true)
  })

  it('sets up a different account only after the owner confirms', async () => {
    account.mockResolvedValue({ available: true, connected: false, disconnected: true })
    newAccountLink.mockResolvedValue('https://connect.stripe.test/setup/acct_2')
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    await user.click(await screen.findByRole('button', { name: 'Use a different account' }))
    expect(newAccountLink).not.toHaveBeenCalled()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Continue to Stripe' }))

    // jsdom cannot navigate; what matters is the link was asked for with this portal's return URLs.
    await waitFor(() => expect(newAccountLink).toHaveBeenCalledOnce())
    expect(newAccountLink).toHaveBeenCalledWith(onboardingLinks(window.location.origin))
  })
})
