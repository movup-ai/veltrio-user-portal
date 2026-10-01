import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@/i18n'
import type { RateOption } from '../types/vehicle.types'
import { planRental } from '../utils/rate-plan'
import { RatePlanNotice } from './RatePlanNotice'
import { RatePlanTags } from './RatePlanTags'

const HOURLY: RateOption = {
  id: 'h',
  label: 'Hourly',
  basis: 'hour',
  rate: 15,
  includedMiles: 20,
  unlimitedMileage: false,
}
const DAILY: RateOption = {
  id: 'd',
  label: 'Daily',
  basis: 'day',
  rate: 100,
  includedMiles: 200,
  unlimitedMileage: false,
}

describe('automatic pricing is announced', () => {
  it('says when hourly billing was capped, and at what price', () => {
    const plan = planRental([HOURLY], [], 52, 8)!
    render(
      <>
        <RatePlanTags plan={plan} />
        <RatePlanNotice plan={plan} />
      </>,
    )

    expect(screen.getByText('Hourly (8 h/day cap) × 2 + Hourly × 4')).toBeInTheDocument()
    expect(screen.getByText('Auto')).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(
      'Priced automatically: Hourly is capped at 8 hours a day, so each full day costs $120.',
    )
  })

  it('says when a package was repeated to cover the trip', () => {
    const block: RateOption = {
      ...HOURLY,
      id: 'b',
      label: '4-Hour Block',
      basis: 'fixed',
      rate: 80,
      blockDuration: 4,
      blockDurationUnit: 'hours',
    }
    render(<RatePlanNotice plan={planRental([block], [], 6, 8)!} />)

    expect(screen.getByRole('note')).toHaveTextContent('4-Hour Block is billed 2 times to cover it.')
  })

  it('stays quiet when every line is a rate the operator entered', () => {
    const plan = planRental([HOURLY, DAILY], [], 52, 8)!
    render(
      <>
        <RatePlanTags plan={plan} />
        <RatePlanNotice plan={plan} />
      </>,
    )

    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    expect(screen.queryByText('Auto')).not.toBeInTheDocument()
  })
})
