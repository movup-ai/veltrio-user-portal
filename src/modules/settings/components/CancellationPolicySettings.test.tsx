import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { useOrganizationStore } from '@/state/organization.store'
import type { Company } from '../types/company.types'
import { CancellationPolicySettings } from './CancellationPolicySettings'

const get = vi.fn<() => Promise<Company>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))
vi.mock('../api/company.api', () => ({ companyApi: { get: () => get() } }))

const COMPANY: Company = {
  id: 't_1',
  name: 'Sunstate Car Co.',
  subdomain: 'sunstate',
  fleetSize: '11_50',
  country: 'US',
  currencyLocked: false,
  timezone: 'America/New_York',
  currency: 'USD',
  cancellationPolicy: [],
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
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CancellationPolicySettings />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  get.mockReset()
  useOrganizationStore.setState({ membership: null })
})

describe('CancellationPolicySettings', () => {
  it("shows the owner the company's policy as it is saved", async () => {
    get.mockResolvedValue(COMPANY)
    renderAs('owner')

    expect(await screen.findByRole('heading', { name: 'Cancellation policy' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Non-refundable/ })).toBeChecked()
  })

  it('shows nothing to anyone else, and does not ask the API for what it would refuse', () => {
    const { container } = renderAs('manager')

    expect(container).toBeEmptyDOMElement()
    expect(get).not.toHaveBeenCalled()
  })
})
