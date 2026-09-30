import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { BookingVerification } from '../types/booking.types'
import { BookingVerificationStatus } from './BookingVerificationStatus'

function verification(overrides: Partial<BookingVerification> = {}): BookingVerification {
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
      <BookingVerificationStatus onRunCheck={onRunCheck} runBlockedReason="Add the renter first" />,
    )

    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('says what is missing on hover', async () => {
    // The button is disabled, so it fires no pointer events itself — the wrapper span is
    // what receives the hover. Without it the tooltip never opens.
    renderRow(
      <BookingVerificationStatus onRunCheck={vi.fn()} runBlockedReason="Add the renter first" />,
    )

    await userEvent.hover(screen.getByRole('button').parentElement as HTMLElement)

    expect(await screen.findAllByText('Add the renter first')).not.toHaveLength(0)
  })

  it('cannot be clicked while blocked', async () => {
    const onRunCheck = vi.fn()

    renderRow(
      <BookingVerificationStatus onRunCheck={onRunCheck} runBlockedReason="Add the renter first" />,
    )
    await userEvent.click(screen.getByRole('button'))

    expect(onRunCheck).not.toHaveBeenCalled()
  })

  it('runs once the renter is complete', async () => {
    const onRunCheck = vi.fn()

    renderRow(<BookingVerificationStatus onRunCheck={onRunCheck} />)
    await userEvent.click(screen.getByRole('button'))

    expect(onRunCheck).toHaveBeenCalledOnce()
  })
})

describe('a renter who already has a check', () => {
  it('offers the report and no re-run while the result still stands', () => {
    renderRow(
      <BookingVerificationStatus
        verification={verification({ status: 'consider', canReorder: false })}
        onRunCheck={vi.fn()}
        onViewReport={vi.fn()}
      />,
    )

    const labels = screen.getAllByRole('button').map((b) => b.textContent)
    expect(labels).toEqual(['View report'])
  })
})

describe('the insurance card', () => {
  it('offers to verify insurance when nothing is on file', () => {
    renderRow(<BookingVerificationStatus kind="insurance" onRunCheck={vi.fn()} />)

    expect(screen.getByText('Insurance verification')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveTextContent('Verify insurance')
  })

  it('reopens a session the renter left unfinished', async () => {
    // Without this the card sat on "Waiting for renter" with no way back into the session.
    const onRunCheck = vi.fn()

    renderRow(
      <BookingVerificationStatus
        kind="insurance"
        verification={verification({ status: 'running', hasReport: false, completedAt: undefined })}
        onRunCheck={onRunCheck}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Reopen session' }))

    expect(onRunCheck).toHaveBeenCalledOnce()
  })

  it('makes Send link the primary action when it is the only one', () => {
    renderRow(<BookingVerificationStatus kind="insurance" onShare={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Send link' })).toHaveClass('bg-primary')
  })

  it('shows a check for other dates as on file, never as cover for this rental', () => {
    renderRow(
      <BookingVerificationStatus
        kind="insurance"
        verification={verification({
          hasReport: false,
          forOtherDates: true,
          coversFrom: '2026-10-01',
          coversThrough: '2026-10-05',
        })}
        onShare={vi.fn()}
      />,
    )

    expect(screen.getByText('Other dates')).toBeInTheDocument()
    expect(screen.getByText(/^Last checked for Oct 1 – Oct 5/)).toBeInTheDocument()
    expect(screen.queryByText('Covered')).not.toBeInTheDocument()
    // A session for these dates is a new one, whatever the old dates' session is doing.
    expect(screen.getByRole('button', { name: 'Send new link' })).toBeInTheDocument()
  })

  it('keeps a verdict to the result, without the reason line beneath it', () => {
    renderRow(
      <BookingVerificationStatus
        kind="insurance"
        verification={verification({
          status: 'consider',
          hasReport: false,
          failureReason: 'This policy does not list the renter by name and date of birth',
        })}
      />,
    )

    expect(screen.queryByText(/does not list the renter/)).not.toBeInTheDocument()
  })

  it('still says why a check could not be run at all', () => {
    renderRow(
      <BookingVerificationStatus
        verification={verification({
          status: 'error',
          hasReport: false,
          failureReason: 'Checkr could not be reached to finish this check',
        })}
      />,
    )

    expect(screen.getByText('Checkr could not be reached to finish this check')).toBeInTheDocument()
  })

  it('says a new link is sent once there is a result to replace', () => {
    renderRow(
      <BookingVerificationStatus
        kind="insurance"
        verification={verification({ status: 'consider', hasReport: false, canReorder: true })}
        onShare={vi.fn()}
      />,
    )

    expect(screen.getByRole('button')).toHaveTextContent('Send new link')
  })

  it('says which policy the verdict came from', () => {
    renderRow(
      <BookingVerificationStatus
        kind="insurance"
        verification={verification({
          hasReport: false,
          policy: { carrier: 'State Farm', policyNumber: 'SF-123456', expiresOn: '2027-01-01' },
        })}
      />,
    )

    expect(screen.getByText(/^State Farm · SF-123456 · Expires /)).toBeInTheDocument()
  })

  it('shows the expiry date itself, not the day before in a US time zone', () => {
    // new Date('2027-01-01') is UTC midnight: 31 December anywhere west of Greenwich.
    vi.stubEnv('TZ', 'America/New_York')
    try {
      renderRow(
        <BookingVerificationStatus
          kind="insurance"
          verification={verification({ hasReport: false, policy: { expiresOn: '2027-01-01' } })}
        />,
      )

      expect(screen.getByText('Expires Jan 1')).toBeInTheDocument()
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
