import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { RateOption } from '../types/vehicle.types'
import { EffectiveRatesPreview } from './EffectiveRatesPreview'

const CARD: RateOption[] = [
  { id: 'd', label: 'Daily', basis: 'day', rate: 400, includedMiles: 200, unlimitedMileage: false },
  { id: 'w', label: 'Weekly', basis: 'week', rate: 2200, includedMiles: 1500, unlimitedMileage: false },
]
const TIERS = [
  { minDays: 3, percentOff: 10 },
  { minDays: 7, percentOff: 15 },
]

describe('EffectiveRatesPreview', () => {
  it('stays collapsed until asked for', () => {
    render(<EffectiveRatesPreview options={CARD} tiers={TIERS} hoursPerDay={8} />)

    expect(screen.getByRole('button', { name: 'Show effective rates' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('prices each trip length with the rule that fired', async () => {
    const user = userEvent.setup({ delay: null })
    render(<EffectiveRatesPreview options={CARD} tiers={TIERS} hoursPerDay={8} />)

    await user.click(screen.getByRole('button', { name: 'Show effective rates' }))

    // Weekly + Daily × 3 = $3,400, less 15% for 7+ days.
    const tenDays = within(screen.getByText('10-day rental').closest('li')!)
    expect(tenDays.getByText('Weekly + Daily × 3')).toBeInTheDocument()
    expect(tenDays.getByText('7+ days: −15%')).toBeInTheDocument()
    expect(tenDays.getByText('$2,890')).toBeInTheDocument()
  })

  it('leaves out an option still at $0, which would otherwise win every row', async () => {
    const user = userEvent.setup({ delay: null })
    const halfTyped = { ...CARD[0], id: 'x', label: 'Hourly', basis: 'hour' as const, rate: 0 }
    render(<EffectiveRatesPreview options={[...CARD, halfTyped]} tiers={[]} hoursPerDay={8} />)

    await user.click(screen.getByRole('button', { name: 'Show effective rates' }))

    expect(screen.queryByText(/Hourly/)).not.toBeInTheDocument()
  })

  it('explains the Auto rows when hourly billing is capped', async () => {
    const user = userEvent.setup({ delay: null })
    const hourly: RateOption = {
      id: 'h',
      label: 'Hourly',
      basis: 'hour',
      rate: 15,
      includedMiles: 20,
      unlimitedMileage: false,
    }
    render(<EffectiveRatesPreview options={[hourly]} tiers={[]} hoursPerDay={8} />)

    await user.click(screen.getByRole('button', { name: 'Show effective rates' }))

    // One day by the hour would be $360; capped, it is 8 × $15.
    expect(within(screen.getByText('1-day rental').closest('li')!).getByText('$120')).toBeInTheDocument()
    expect(screen.getByText(/Hourly rates are capped at 8 hours a day/)).toBeInTheDocument()
  })
})
