import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import '@/i18n'
import { StepProgress } from './OnboardingSteps'
import type { OnboardingStep } from './onboarding-steps'

function renderAt(current: OnboardingStep) {
  return render(
    <MemoryRouter>
      <StepProgress current={current} />
    </MemoryRouter>,
  )
}

describe('StepProgress', () => {
  it('marks the steps behind as done and announces the one in progress', () => {
    renderAt('plan')

    const steps = screen.getAllByRole('listitem')
    expect(steps.map((step) => step.textContent)).toEqual([
      'Account (done)',
      'Company (done)',
      '3Plan',
      '4Ready',
    ])
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Plan')
  })

  it('leads back to each step already done, but not to the account or ahead', () => {
    renderAt('ready')

    expect(screen.getByRole('link', { name: /^Company/ })).toHaveAttribute('href', '/onboarding')
    expect(screen.getByRole('link', { name: /^Plan/ })).toHaveAttribute('href', '/onboarding/plan')
    // The account exists by now: sign-up is not somewhere to go back to.
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('offers nothing to go back to from the company step but the finished account', () => {
    renderAt('company')

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
