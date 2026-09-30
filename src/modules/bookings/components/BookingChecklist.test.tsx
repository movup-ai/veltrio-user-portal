import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
// Initialises the translations; the tiles used to pull this in only by accident.
import '@/i18n'
import type {
  BookingCheckStep,
  BookingVerification,
  ProviderKind,
} from '../types/booking.types'
import { BookingChecklist } from './BookingChecklist'

const CHECKS: BookingCheckStep[] = [
  { key: 'background', done: false },
  { key: 'identity', done: true },
  { key: 'insurance', done: false },
]

function verification(overrides: Partial<BookingVerification> = {}): BookingVerification {
  return {
    id: 'v1',
    status: 'clear',
    recordsFound: false,
    hasReport: true,
    canReorder: true,
    reused: false,
    completedAt: '2026-09-28T10:00:00Z',
    createdAt: '2026-09-28T10:00:00Z',
    updatedAt: '2026-09-28T10:00:00Z',
    ...overrides,
  }
}

function renderList(
  providerKinds: readonly ProviderKind[],
  verifications: Partial<Record<ProviderKind, BookingVerification>> = {},
  onOrder = vi.fn(),
) {
  render(
    <BookingChecklist
      checks={CHECKS}
      verifications={verifications}
      providerKinds={providerKinds}
      openingReport={false}
      onOrder={onOrder}
      onViewReport={vi.fn()}
      onAction={vi.fn()}
    />,
  )
  return onOrder
}

describe('which tiles a provider answers for', () => {
  it('drives the tile off providerKinds, not off the kind itself', () => {
    // The point of the restructure: adding a kind means adding it to this list, not adding a
    // branch. Insurance renders as a provider tile purely by being listed.
    renderList(['background', 'insurance'])

    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Run check' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verify insurance' })).toBeInTheDocument()
  })

  it('leaves a kind with no provider as a tick the counter sets', () => {
    renderList(['background', 'insurance'])

    expect(screen.getByRole('button', { name: /view id check/i })).toBeInTheDocument()
  })

  it('words each tile for its own provider', () => {
    // Every label was once Checkr's, so an insurance tile waiting on the renter read "Checkr
    // is searching" and a lapsed policy said "Records were found".
    renderList(['background', 'insurance'], {
      insurance: verification({ status: 'consider', hasReport: false }),
    })

    expect(screen.getByText(/no policy covers every day of this rental/i)).toBeInTheDocument()
    expect(screen.queryByText(/records were found/i)).not.toBeInTheDocument()
  })

  it('shows each kind its own verification, not one shared result', () => {
    // Keyed by kind: a clear background check must not make insurance look verified.
    renderList(['background', 'insurance'], { background: verification() })

    expect(screen.getByText(/no records were found/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verify insurance' })).toBeInTheDocument()
  })

  it('offers to reopen an insurance session the renter did not finish', () => {
    // Without this a renter who closed the Axle tab left the tile running for good, since the
    // open session blocks starting another.
    const onOrder = renderList(['background', 'insurance'], {
      insurance: verification({ status: 'running', canReorder: false, completedAt: undefined }),
    })

    screen.getByRole('button', { name: 'Reopen session' }).click()

    expect(onOrder).toHaveBeenCalledWith('insurance')
  })

  it('reports which kind was ordered', () => {
    const onOrder = renderList(['background', 'insurance'])

    screen.getByRole('button', { name: 'Verify insurance' }).click()

    expect(onOrder).toHaveBeenCalledWith('insurance')
  })
})

describe('sending the renter a link', () => {
  it('is offered only for a check the renter finishes themselves', () => {
    // A background check runs on Checkr's side; a link would give the renter nothing to do.
    const onShare = vi.fn()
    render(
      <BookingChecklist
        checks={CHECKS}
        verifications={{}}
        providerKinds={['background', 'insurance']}
        openingReport={false}
        onOrder={vi.fn()}
        onViewReport={vi.fn()}
        onShare={onShare}
        onAction={vi.fn()}
      />,
    )

    const send = screen.getAllByRole('button', { name: 'Send link' })
    expect(send).toHaveLength(1)
    send[0].click()
    expect(onShare).toHaveBeenCalledWith('insurance')
  })
})
