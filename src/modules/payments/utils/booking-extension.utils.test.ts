import { describe, expect, it } from 'vitest'
import { ApiError } from '@/types/api'
import type { BookingExtension } from '../types/booking-extension.types'
import {
  addedTime,
  addenda,
  chosenReturn,
  extendUnavailable,
  extensionError,
  extensionWarnings,
  refundDue,
  returnDayBounds,
  returnProblem,
  suggestedReturn,
} from './booking-extension.utils'

/** Local wall-clock times throughout, so the cases read the same in any runner's zone. */
const at = (day: number, hour = 10, minute = 0) => new Date(2026, 9, day, hour, minute)
const iso = (day: number, hour = 10, minute = 0) => at(day, hour, minute).toISOString()

function extension(overrides: Partial<BookingExtension>): BookingExtension {
  return {
    id: 'e1',
    status: 'applied',
    previousReturnAt: iso(10),
    newReturnAt: iso(12),
    previousTotal: 235.4,
    newTotal: 353.1,
    amount: 117.7,
    requestedAt: iso(9),
    refundDue: 0,
    hasAddendum: true,
    ...overrides,
  }
}

describe('suggestedReturn', () => {
  it('offers a day more at the hour the car was due', () => {
    expect(suggestedReturn(iso(10, 14, 30), at(8))).toEqual({ date: '2026-10-11', time: '14:30' })
  })

  it('offers the first such hour still ahead when the car is already late', () => {
    expect(suggestedReturn(iso(5, 9), at(8, 16))).toEqual({ date: '2026-10-09', time: '09:00' })
    // Later today still counts: the car was due at 18:00 days ago, and it is only 16:00.
    expect(suggestedReturn(iso(5, 18), at(8, 16))).toEqual({ date: '2026-10-08', time: '18:00' })
  })

  it('stops where the next booking begins when a full day does not fit', () => {
    expect(suggestedReturn(iso(10), at(8), iso(10, 18))).toEqual({ date: '2026-10-10', time: '18:00' })
    // A booking that leaves no time at all is not a suggestion: the dialog says why instead.
    expect(suggestedReturn(iso(10), at(8), iso(10))).toEqual({ date: '2026-10-11', time: '10:00' })
  })
})

describe('chosenReturn', () => {
  it('reads the day and time as one local instant', () => {
    expect(chosenReturn({ date: '2026-10-12', time: '09:30' })).toEqual(at(12, 9, 30))
  })

  it('is nothing until both halves are picked', () => {
    expect(chosenReturn({ date: '', time: '09:30' })).toBeUndefined()
    expect(chosenReturn({ date: '2026-10-12', time: '' })).toBeUndefined()
  })
})

describe('returnProblem', () => {
  const due = iso(10)
  const now = at(8)

  it('accepts a later return that is still ahead and before the next booking', () => {
    expect(returnProblem(at(12), due, iso(14), now)).toBeUndefined()
    expect(returnProblem(at(12), due, undefined, now)).toBeUndefined()
  })

  it('refuses one that is not later than the current return', () => {
    expect(returnProblem(at(10), due, undefined, now)).toBe('notLater')
    expect(returnProblem(at(9), due, undefined, now)).toBe('notLater')
  })

  it('refuses one already past, which only an overdue rental can name', () => {
    expect(returnProblem(at(7), iso(5), undefined, now)).toBe('inPast')
  })

  it('lets the car run up to the moment the next booking starts, and no further', () => {
    expect(returnProblem(at(14), due, iso(14), now)).toBeUndefined()
    expect(returnProblem(at(14, 10, 30), due, iso(14), now)).toBe('pastNextBooking')
  })
})

describe('returnDayBounds', () => {
  it('starts at the day the car is due and ends where the next booking begins', () => {
    expect(returnDayBounds(iso(10), iso(14), at(8))).toEqual({ min: '2026-10-10', max: '2026-10-14' })
  })

  it('starts today for a car already late, and has no end with nothing following', () => {
    expect(returnDayBounds(iso(5), undefined, at(8))).toEqual({ min: '2026-10-08', max: undefined })
  })
})

describe('addedTime', () => {
  it('splits the extra time into days and hours', () => {
    expect(addedTime(iso(10), iso(12))).toEqual({ days: 2, hours: 0 })
    expect(addedTime(iso(10), iso(11, 15))).toEqual({ days: 1, hours: 5 })
    expect(addedTime(iso(10), iso(10, 16))).toEqual({ days: 0, hours: 6 })
  })
})

describe('extensionWarnings', () => {
  const held = { status: 'held' as const, captureBefore: iso(13) }

  it('says nothing while the hold and the cover outlast the new return', () => {
    expect(extensionWarnings(at(12), held, '2026-10-12')).toEqual([])
    expect(extensionWarnings(at(12), undefined, undefined)).toEqual([])
  })

  it('warns when the deposit hold lapses before the car is back', () => {
    expect(extensionWarnings(at(14), held, undefined)).toEqual(['depositLapses'])
  })

  it('does not warn about a deposit that is no longer only held', () => {
    expect(extensionWarnings(at(14), { status: 'captured', captureBefore: iso(13) }, undefined)).toEqual([])
  })

  it('warns when the verified insurance ends before the day of the new return', () => {
    expect(extensionWarnings(at(13), undefined, '2026-10-12')).toEqual(['insuranceEnds'])
  })
})

describe('extensionError', () => {
  it('passes on a reason the dialog has words for', () => {
    const refused = new ApiError('conflict', 'BK-1 has this vehicle', {
      status: 409,
      code: 'vehicle_unavailable',
    })
    expect(extensionError(refused)).toBe('vehicle_unavailable')
  })

  it('drops one it has none for, so the API message is shown instead', () => {
    expect(
      extensionError(new ApiError('conflict', 'x', { status: 409, code: 'payment_processing' })),
    ).toBeUndefined()
    expect(extensionError(new Error('offline'))).toBeUndefined()
  })
})

describe('extendUnavailable', () => {
  it('leaves the row on when the API allows it', () => {
    expect(extendUnavailable({ extend: { allowed: true }, history: [] }, false)).toBeUndefined()
  })

  it('passes on why the API will not take one', () => {
    const waiting = { extend: { allowed: false, reason: 'extension_pending' as const }, history: [] }
    expect(extendUnavailable(waiting, false)).toEqual({ reason: 'extension_pending' })
  })

  it('is off without a reason while the answer is on its way', () => {
    expect(extendUnavailable(undefined, false)).toEqual({ reason: undefined })
  })

  it('says the check failed instead of reading as a booking that cannot be extended', () => {
    expect(extendUnavailable(undefined, true)).toEqual({ reason: 'loadFailed' })
  })
})

describe('addenda', () => {
  it('numbers them oldest first, as the API numbers the files, and skips the rest', () => {
    const history = [
      extension({ id: 'newest' }),
      extension({ id: 'expired', status: 'expired', hasAddendum: false }),
      extension({ id: 'oldest' }),
    ]

    expect(addenda(history).map(({ extension: e, number }) => [e.id, number])).toEqual([
      ['oldest', 1],
      ['newest', 2],
    ])
  })
})

describe('refundDue', () => {
  it('adds up what was paid for requests that never took effect', () => {
    const history = [
      extension({}),
      extension({ status: 'expired', hasAddendum: false, refundDue: 117.7 }),
      extension({ status: 'expired', hasAddendum: false, refundDue: 58.85 }),
    ]

    expect(refundDue(history)).toBe(176.55)
    expect(refundDue([])).toBe(0)
  })
})
