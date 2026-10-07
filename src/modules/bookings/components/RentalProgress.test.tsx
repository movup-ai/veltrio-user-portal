import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@/i18n'
import type { BookingStageStep } from '../types/booking.types'
import { RentalProgress } from './RentalProgress'

/** The step's own list item, by its label. */
const step = (label: string) => screen.getByText(label).closest('li') as HTMLElement

describe('RentalProgress', () => {
  it('says where a declined reservation ended, and that the later steps were never reached', () => {
    const stages: BookingStageStep[] = [
      { key: 'reserved', state: 'done', at: '2026-10-06T09:00:00Z', channel: 'web' },
      { key: 'confirmed', state: 'skipped' },
      { key: 'pickedUp', state: 'skipped' },
      { key: 'returned', state: 'skipped' },
      { key: 'closed', state: 'skipped' },
    ]
    render(<RentalProgress stages={stages} />)

    // Not "Stage 5 of 5": nothing after Reserved happened.
    expect(screen.getByText('Ended at Reserved')).toBeInTheDocument()
    expect(screen.queryByText(/Stage \d of 5/)).not.toBeInTheDocument()
    expect(screen.getAllByText('Not reached')).toHaveLength(4)
    expect(within(step('Reserved')).getByText(/^Oct \d+, \d{1,2}:\d{2} [AP]M · web$/)).toBeInTheDocument()
  })

  it('does not draw the step still ahead as partly done', () => {
    // It was half-filled to mean "in progress", which read as a pickup that was half over.
    const stages: BookingStageStep[] = [
      { key: 'reserved', state: 'done' },
      { key: 'confirmed', state: 'done' },
      { key: 'pickedUp', state: 'current', at: '2026-10-14T14:00:00Z' },
      { key: 'returned', state: 'pending', at: '2026-10-20T14:00:00Z' },
      { key: 'closed', state: 'pending' },
    ]
    render(<RentalProgress stages={stages} />)

    const filled = (label: string) => step(label).querySelector('[data-filled]') !== null
    expect(['Reserved', 'Confirmed'].map(filled)).toEqual([true, true])
    expect(['Picked up', 'Returned', 'Closed'].map(filled)).toEqual([false, false, false])
  })

  it('marks the step in progress, and shows a finished one without a date as plain Done', () => {
    const stages: BookingStageStep[] = [
      { key: 'reserved', state: 'done' },
      { key: 'confirmed', state: 'done' },
      { key: 'pickedUp', state: 'current', at: '2026-10-14T14:00:00Z' },
      { key: 'returned', state: 'pending', at: '2026-10-20T14:00:00Z' },
      { key: 'closed', state: 'pending' },
    ]
    render(<RentalProgress stages={stages} />)

    expect(screen.getByText('Stage 2 of 5')).toBeInTheDocument()
    expect(within(step('Confirmed')).getByText('Done')).toBeInTheDocument()
    expect(step('Picked up')).toHaveAttribute('aria-current', 'step')
    expect(within(step('Picked up')).getByText(/^Scheduled /)).toBeInTheDocument()
    expect(within(step('Returned')).getByText(/^Due /)).toBeInTheDocument()
    // It was "Pending return", which is wrong once the car is back and only the paperwork is left.
    expect(within(step('Closed')).getByText('Not closed yet')).toBeInTheDocument()
  })
})
