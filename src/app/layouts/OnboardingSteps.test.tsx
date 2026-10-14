import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@/i18n'
import { StepProgress } from './OnboardingSteps'

describe('StepProgress', () => {
  it('marks the steps behind as done and announces the one in progress', () => {
    render(<StepProgress current="plan" />)

    const steps = screen.getAllByRole('listitem')
    expect(steps.map((step) => step.textContent)).toEqual([
      'Account (done)',
      'Company (done)',
      '3Plan',
      '4Ready',
    ])
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Plan')
  })
})
