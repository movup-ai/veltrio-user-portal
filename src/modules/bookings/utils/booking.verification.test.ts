import { describe, expect, it } from 'vitest'
import type { BookingVerification, VerificationRecord, VerificationStatus } from '../types/booking.types'
import {
  logActions,
  outlastsCover,
  resendInsuranceOrder,
  sendsNewLink,
  verificationView,
} from './booking.verification'

const TODAY = '2026-10-08'

function row(overrides: Partial<VerificationRecord> = {}): VerificationRecord {
  return {
    id: 'v1',
    kind: 'insurance',
    name: 'Kevin Ragira',
    dateOfBirth: '1987-11-11',
    status: 'consider',
    recordsFound: false,
    hasReport: false,
    completedAt: '2026-09-30T14:31:00Z',
    createdAt: '2026-09-30T14:30:00Z',
    ...overrides,
  }
}

describe('what a history row offers', () => {
  it('opens a background report, and lets a manager delete the finished check', () => {
    expect(logActions(row({ kind: 'background', status: 'clear', hasReport: true }), true, TODAY)).toEqual([
      'viewReport',
      'delete',
    ])
  })

  it('offers insurance a new link after a verdict that needs one', () => {
    expect(logActions(row({ status: 'consider' }), true, TODAY)).toEqual(['sendNewLink', 'delete'])
    expect(logActions(row({ status: 'error' }), false, TODAY)).toEqual(['sendNewLink'])
  })

  it('offers the same link again while the renter has not finished, and no delete', () => {
    // The API refuses to delete a running check: the renter could still answer it.
    expect(logActions(row({ status: 'running', completedAt: undefined }), true, TODAY)).toEqual(['sendLink'])
  })

  it('leaves covered insurance with nothing to send', () => {
    expect(logActions(row({ status: 'clear' }), true, TODAY)).toEqual(['delete'])
    // Its last day still counts.
    expect(logActions(row({ status: 'clear', validUntil: TODAY }), true, TODAY)).toEqual(['delete'])
  })

  it('offers a new link once covered insurance has run out', () => {
    expect(logActions(row({ status: 'clear', validUntil: '2026-10-07' }), true, TODAY)).toEqual([
      'sendNewLink',
      'delete',
    ])
  })

  it('keeps delete from counter staff', () => {
    expect(logActions(row({ status: 'clear' }), false, TODAY)).toEqual([])
  })

  it('cannot send a link for a row with no birth date to match on', () => {
    expect(logActions(row({ dateOfBirth: undefined }), false, TODAY)).toEqual([])
  })
})

describe('the session a history row opens again', () => {
  const RETURN = 'https://portal.test/insurance/return'

  it('goes back through the booking, so the link lands on it', () => {
    const order = resendInsuranceOrder(row({ bookingReference: 'BK-10001', email: 'k@example.com' }), RETURN)

    expect(order).toEqual({
      name: 'Kevin Ragira',
      dateOfBirth: '1987-11-11',
      email: 'k@example.com',
      reference: 'BK-10001',
      redirectUri: RETURN,
    })
  })

  it('names only the person when there is no booking: a check is no longer for set dates', () => {
    const order = resendInsuranceOrder(row({ validUntil: '2026-10-23' }), RETURN)

    expect(order).toEqual({
      name: 'Kevin Ragira',
      dateOfBirth: '1987-11-11',
      email: undefined,
      redirectUri: RETURN,
    })
  })
})

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

describe('an insurance check that has run out', () => {
  it('is cover no longer, and offers to verify again', () => {
    const view = verificationView(verification({ expired: true, validUntil: '2026-10-05' }), 'insurance')

    expect(view.tone).toBe('error')
    expect(view.stateKey).toBe('expired')
    expect(view.action).toBe('order')
    expect(view.canViewReport).toBe(false)
  })

  it('reads as covered until then', () => {
    expect(verificationView(verification({ validUntil: '2027-01-01' }), 'insurance').stateKey).toBe('clear')
  })
})

describe('a rental that outlasts verified cover', () => {
  it('is flagged when the cover ends before the return day', () => {
    expect(outlastsCover(verification({ validUntil: '2026-10-05' }), '2026-10-06')).toBe(true)
  })

  it('is not when the cover lasts through the return day', () => {
    expect(outlastsCover(verification({ validUntil: '2026-10-05' }), '2026-10-05')).toBe(false)
    expect(outlastsCover(verification({ validUntil: '2026-10-05' }), '2026-10-01')).toBe(false)
  })

  it('says nothing where there is no standing verdict to outlast', () => {
    expect(outlastsCover(undefined, '2026-10-06')).toBe(false)
    expect(outlastsCover(verification({}), '2026-10-06')).toBe(false)
    expect(outlastsCover(verification({ validUntil: '2026-10-05' }), undefined)).toBe(false)
    // Already expired is its own state, shown in red: a second note would only repeat it.
    expect(outlastsCover(verification({ validUntil: '2026-10-05', expired: true }), '2026-10-06')).toBe(false)
  })
})

describe('whether a link starts a fresh check', () => {
  it('hands back the open session while the renter is still on it', () => {
    expect(sendsNewLink(undefined)).toBe(false)
    expect(sendsNewLink(verification({ status: 'running' }))).toBe(false)
  })

  it('starts a new one after a result', () => {
    expect(sendsNewLink(verification({ status: 'consider' }))).toBe(true)
    expect(sendsNewLink(verification({ status: 'error' }))).toBe(true)
    expect(sendsNewLink(verification({ status: 'clear', expired: true }))).toBe(true)
  })
})

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
