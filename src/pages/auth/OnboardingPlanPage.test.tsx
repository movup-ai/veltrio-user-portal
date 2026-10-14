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

  it.each([
    ['the deployment does not bill', { ...BILLING, enabled: false }],
    ['a plan is already running', { ...BILLING, active: true, plan: 'growth', status: 'trialing' }],
  ])('moves straight on when %s', (_, billing) => {
    billingResult.current = { data: billing, isLoading: false }
    renderStep()

    expect(screen.getByText('Ready step')).toBeInTheDocument()
    expect(screen.queryByText('Plans')).not.toBeInTheDocument()
  })
})
