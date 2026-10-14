import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { ApiError } from '@/types/api'
import { useOrganizationStore } from '@/state/organization.store'
import { billingKeys } from '../hooks/use-billing'
import { usePlanLimitStore } from '@/state/plan-limit.store'
import { showPlanLimit, usePlanLimitGuard } from '../hooks/use-plan-limit'
import type { Billing } from '../types/billing.types'
import { PlanLimitDialog } from './PlanLimitDialog'

const get = vi.fn<() => Promise<Billing>>()

vi.mock('../api/billing.api', () => ({ billingApi: { get: () => get() } }))

const FULL: Billing = {
  enabled: true,
  active: true,
  plan: 'starter',
  interval: 'month',
  status: 'active',
  cancelAtPeriodEnd: false,
  trialAvailable: false,
  trialDays: 7,
  vehicles: 5,
  branches: 1,
  maxVehicles: 5,
  maxBranches: 1,
  currency: 'USD',
  yearlyDiscountPercent: 15,
  plans: [],
  credits: { balance: 5, costs: { background: 2, insurance: 5 }, packs: [], lowBalance: 10 },
}

/** An Add vehicle button, guarded as the vehicles page guards it. */
function AddVehicle() {
  const refusedByPlan = usePlanLimitGuard()
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => !refusedByPlan('vehicles') && navigate('/vehicles/new')}>
      Add vehicle
    </button>
  )
}

function renderAs(role: 'owner' | 'manager', billing: Billing) {
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
  get.mockResolvedValue(billing)
  const queryClient = new QueryClient()
  queryClient.setQueryData(billingKeys.billing, billing)
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/vehicles']}>
        <Routes>
          <Route path="/vehicles" element={<AddVehicle />} />
          <Route path="/vehicles/new" element={<p>Vehicle form</p>} />
          <Route path="/settings/billing" element={<p>Billing tab</p>} />
        </Routes>
        <PlanLimitDialog />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup({ delay: null })
}

afterEach(() => {
  get.mockReset()
  act(() => usePlanLimitStore.getState().close())
  useOrganizationStore.setState({ membership: null })
})

describe('PlanLimitDialog', () => {
  it('stops an add the plan has no room for before the form, and leads to the plans', async () => {
    const user = renderAs('owner', FULL)

    await user.click(screen.getByRole('button', { name: 'Add vehicle' }))

    const dialog = await screen.findByRole('dialog')
    expect(screen.queryByText('Vehicle form')).not.toBeInTheDocument()
    expect(dialog).toHaveTextContent("You've reached your vehicle limit")
    expect(dialog).toHaveTextContent('Your Starter plan covers up to 5 vehicles.')
    expect(dialog).not.toHaveTextContent('Only the account owner')
    await user.click(screen.getByRole('button', { name: 'View plans' }))
    expect(await screen.findByText('Billing tab')).toBeInTheDocument()
  })

  it('lets an add through while the plan has room', async () => {
    const user = renderAs('owner', { ...FULL, vehicles: 4 })

    await user.click(screen.getByRole('button', { name: 'Add vehicle' }))

    expect(await screen.findByText('Vehicle form')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('asks a company with no running plan to choose one', async () => {
    const user = renderAs('owner', { ...FULL, active: false, plan: undefined, status: undefined })

    await user.click(screen.getByRole('button', { name: 'Add vehicle' }))

    expect(await screen.findByRole('dialog')).toHaveTextContent('Choose a plan first')
  })

  it('sends a company whose plan is on hold to fix its card, not to choose a plan', async () => {
    // Stripe still holds the subscription, so the plans cannot be bought until the card is fixed.
    const user = renderAs('owner', { ...FULL, active: false, status: 'unpaid' })

    await user.click(screen.getByRole('button', { name: 'Add vehicle' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Your plan is on hold')
    expect(dialog).toHaveTextContent('Update your card under Manage billing')
    expect(dialog).not.toHaveTextContent('Choose a plan first')
  })

  it('opens on the API refusing for the plan, and says the plan is the owner’s to change', async () => {
    renderAs('manager', { ...FULL, plan: 'growth', branches: 3, maxBranches: 3 })
    const refusal = new ApiError('conflict', 'Your plan covers 3 branches.', {
      status: 409,
      code: 'branch_limit_reached',
    })

    act(() => {
      expect(showPlanLimit(refusal)).toBe(true)
    })

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent("You've reached your branch limit")
    expect(dialog).toHaveTextContent('Your Growth plan covers 3 branches.')
    expect(dialog).toHaveTextContent('Only the account owner can change the plan.')
  })

  it('leaves any other refusal to the toast that reports it', () => {
    const other = new ApiError('conflict', 'This VIN is already in your fleet.', {
      status: 409,
      code: 'vin_already_exists',
    })

    expect(showPlanLimit(other)).toBe(false)
    expect(usePlanLimitStore.getState().limit).toBeUndefined()
  })
})
