import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@/i18n'
import { HourlyCapNote } from './HourlyCapNote'

describe('HourlyCapNote', () => {
  it('shows the automatic cap when there is no Daily rate', () => {
    render(<HourlyCapNote options={[{ basis: 'hour' }]} hoursPerDay={6} />)
    expect(screen.getByText('Hourly rates bill at most 6 hours a day.')).toBeInTheDocument()
  })

  it('credits the Daily rate, not the automatic cap, when one exists', () => {
    render(<HourlyCapNote options={[{ basis: 'hour' }, { basis: 'day' }]} hoursPerDay={6} />)
    expect(
      screen.getByText('Hourly billing never costs more than the Daily rate in a day.'),
    ).toBeInTheDocument()
  })

  it('says nothing without an hourly rate', () => {
    const { container } = render(<HourlyCapNote options={[{ basis: 'day' }]} hoursPerDay={6} />)
    expect(container).toBeEmptyDOMElement()
  })
})
