import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { BookingScreening } from '../types/booking.types'
import { BookingScreeningStatus } from './BookingScreeningStatus'

function screening(overrides: Partial<BookingScreening> = {}): BookingScreening {
  return {
    id: 's1',
    customerId: 'cus_1',
    status: 'clear',
    recordsFound: false,
    hasReport: true,
    canReorder: false,
    reused: false,
    completedAt: '2026-09-20T10:00:00Z',
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
    ...overrides,
  }
}

/** The provider is mounted app-wide; the tooltip renders nothing without it. */
function renderRow(ui: React.ReactElement) {
  return render(<TooltipProvider delayDuration={0}>{ui}</TooltipProvider>)
}

describe('the run button while the renter is incomplete', () => {
  it('is shown disabled rather than hidden, so the action stays where it is expected', () => {
    const onRunCheck = vi.fn()

    renderRow(
      <BookingScreeningStatus onRunCheck={onRunCheck} runBlockedReason="Add the renter first" />,
    )

    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('says what is missing on hover', async () => {
    // The button is disabled, so it fires no pointer events itself — the wrapper span is
    // what receives the hover. Without it the tooltip never opens.
    renderRow(
      <BookingScreeningStatus onRunCheck={vi.fn()} runBlockedReason="Add the renter first" />,
    )

    await userEvent.hover(screen.getByRole('button').parentElement as HTMLElement)

    expect(await screen.findAllByText('Add the renter first')).not.toHaveLength(0)
  })

  it('cannot be clicked while blocked', async () => {
    const onRunCheck = vi.fn()

    renderRow(
      <BookingScreeningStatus onRunCheck={onRunCheck} runBlockedReason="Add the renter first" />,
    )
    await userEvent.click(screen.getByRole('button'))

    expect(onRunCheck).not.toHaveBeenCalled()
  })

  it('runs once the renter is complete', async () => {
    const onRunCheck = vi.fn()

    renderRow(<BookingScreeningStatus onRunCheck={onRunCheck} />)
    await userEvent.click(screen.getByRole('button'))

    expect(onRunCheck).toHaveBeenCalledOnce()
  })
})

describe('a renter who already has a check', () => {
  it('offers the report and no re-run while the result still stands', () => {
    renderRow(
      <BookingScreeningStatus
        screening={screening({ status: 'consider', canReorder: false })}
        onRunCheck={vi.fn()}
        onViewReport={vi.fn()}
      />,
    )

    const labels = screen.getAllByRole('button').map((b) => b.textContent)
    expect(labels).toEqual(['View report'])
  })
})
