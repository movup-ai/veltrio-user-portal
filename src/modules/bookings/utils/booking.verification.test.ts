import { describe, expect, it } from 'vitest'
import type { BookingVerification, VerificationStatus } from '../types/booking.types'
import { verificationView } from './booking.verification'

function verification(overrides: Partial<BookingVerification> = {}): BookingVerification {
  return {
    id: 's1',
    customerId: 'cus_1',
    status: 'clear',
    recordsFound: false,
    hasReport: true,
    canReorder: false,
    reused: false,
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
    ...overrides,
  }
}

describe('verificationView', () => {
  it('offers to run the check when none has been ordered', () => {
    const view = verificationView(undefined)

    expect(view.stateKey).toBe('notStarted')
    expect(view.action).toBe('order')
    expect(view.inProgress).toBe(false)
  })

  it('shows a clear check as passed with nothing left to do', () => {
    const view = verificationView(verification({ status: 'clear' }))

    expect(view.tone).toBe('success')
    expect(view.stateKey).toBe('clear')
  })

  it('keeps polling while Checkr has not answered', () => {
    // Unusual for an instant check, but it is the case the reconcile job exists for.
    const view = verificationView(verification({ status: 'running' }))

    expect(view.inProgress).toBe(true)
    // Nothing for the counter to do but wait, so no button is offered.
    expect(view.action).toBeUndefined()
  })

  it('flags a consider without treating it as a refusal', () => {
    const view = verificationView(verification({ status: 'consider', recordsFound: true }))

    // Coloured to draw the eye, but it gates nothing - the report is what the branch reads.
    expect(view.tone).toBe('error')
    expect(view.canViewReport).toBe(true)
  })

  it('lets an errored check be run again', () => {
    // An error never completes, so nothing about it stands in the way — the API says so too.
    expect(verificationView(verification({ status: 'error', canReorder: true })).action).toBe('order')
  })

  it('stops polling once Checkr can no longer change its mind', () => {
    for (const status of ['clear', 'consider', 'error'] as VerificationStatus[]) {
      expect(verificationView(verification({ status })).inProgress).toBe(false)
    }
  })

})

describe('offering a re-run', () => {
  it('does not offer one while the result still stands', () => {
    // The row showed Run again on a recent `consider`, and every click came back 409:
    // the API refuses a re-run until the result goes stale.
    const view = verificationView(verification({ status: 'consider', canReorder: false }))

    expect(view.action).toBeUndefined()
    // The report is still there to read — that is the useful action on a `consider`.
    expect(view.canViewReport).toBe(true)
  })

  it('offers one once the result has gone stale', () => {
    expect(verificationView(verification({ status: 'consider', canReorder: true })).action).toBe('order')
  })

  it('offers one after an error, which never stands in the way', () => {
    expect(verificationView(verification({ status: 'error', canReorder: true })).action).toBe('order')
  })

  it('never offers one while Checkr is still working', () => {
    expect(verificationView(verification({ status: 'running', canReorder: false })).action).toBeUndefined()
  })

  it('leaves covered insurance alone, and lets cover that falls short be tried again', () => {
    // Covered already answers for the whole rental, and re-asking only makes the renter
    // connect their insurer again. Falling short is worth a retry with another policy.
    const covered = verification({ status: 'clear', hasReport: false, canReorder: true })
    const short = verification({ status: 'consider', hasReport: false, canReorder: true })

    expect(verificationView(covered, 'insurance').action).toBeUndefined()
    expect(verificationView(short, 'insurance').action).toBe('order')
  })
})
