import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { Billing } from '@/modules/billing/types/billing.types'
import { OnboardingPlanPage } from './OnboardingPlanPage'

const billingResult = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))
vi.mock('@/modules/billing/hooks/use-billing', () => ({ useBilling: () => billingResult.current }))
// The picker has its own tests; here only where it is told to send checkout back to matters.
const picker = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }))
vi.mock('@/modules/billing/components/PlanPicker', () => ({
  PlanPicker: (props: Record<string, unknown>) => {
    picker.props = props
    return <p>Plans</p>
  },
}))
vi.mock('@/components/feedback/Can', () => ({ usePermissions: () => ['settings.manage'] }))

const BILLING = {
  enabled: true,
  active: false,
  cancelAtPeriodEnd: false,
  trialAvailable: true,
  trialDays: 7,
  plans: [],
} as unknown as Billing

function renderStep() {
  return render(
    <MemoryRouter initialEntries={['/onboarding/plan']}>
      <Routes>
        <Route path="/onboarding/plan" element={<OnboardingPlanPage />} />
        <Route path="/onboarding/ready" element={<p>Ready step</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  picker.props = null
})

describe('OnboardingPlanPage', () => {
  it('offers the plans with the trial, and a way past them', () => {
    billingResult.current = { data: BILLING, isLoading: false }
    renderStep()

    expect(screen.getByText('Plans')).toBeInTheDocument()
    expect(screen.getByText(/7-day free trial/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Choose later' })).toHaveAttribute('href', '/onboarding/ready')
    expect(picker.props?.returnTo).toEqual({ donePath: '/onboarding/ready', cancelPath: '/onboarding/plan' })
  })

  it('moves straight on when the deployment does not bill', () => {
    billingResult.current = { data: { ...BILLING, enabled: false }, isLoading: false }
    renderStep()

    expect(screen.getByText('Ready step')).toBeInTheDocument()
    expect(screen.queryByText('Plans')).not.toBeInTheDocument()
  })

  it('stays open when come back to with a plan running, and moves on from there', () => {
    billingResult.current = {
      data: { ...BILLING, active: true, trialAvailable: false, plan: 'growth', status: 'trialing' },
      isLoading: false,
    }
    renderStep()

    // The cards mark the running plan; skipping is no longer the way on.
    expect(screen.getByText('Plans')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Choose later' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/onboarding/ready')
  })
})
