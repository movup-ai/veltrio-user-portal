import { describe, expect, it } from 'vitest'
import {
  toActivityEvent,
  toBooking,
  toBookingFilterQuery,
  toBookingListQuery,
  toBookingLists,
  toBookingPayload,
  toBookingStats,
  toCancelPayload,
  toCancelledBooking,
  toChangePayload,
  toChangeQuote,
  toChangeQuotePayload,
  toChangedBooking,
  toDeclinePayload,
  toInterval,
  toTabCounts,
  toVerification,
  type BookingWire,
  type VerificationWire,
} from './booking.mapper'
import {
  isReadyForPickup,
  type BookingFilters,
  type BookingInput,
  type PaymentState,
} from '../types/booking.types'
import { buildBookingDetails } from '../utils/booking.details'
import { bookingToTuple } from '../utils/booking.utils'

const wire: BookingWire = {
  id: 'b1',
  reference: 'BK-10000',
  status: 'confirmed',
  customer: {
    id: 'c1',
    name: 'Marisol Vega',
    email: 'marisol@example.com',
    phone: '+1 305 442 0118',
    dateOfBirth: '1991-04-17',
    address: null,
    licenceNumber: 'FL D-1204-889',
    licenceExpiry: '2029-03-01',
    gender: null,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  vehicleId: 'v1',
  vehicleName: 'Toyota Camry',
  vehiclePlate: 'ABC1234',
  rate: {
    optionId: 'r1',
    label: 'Daily',
    basis: 'day',
    rateCents: 5500,
    units: 4,
    includedMiles: 800,
    overageRatePerMileCents: 45,
    lines: [{ optionId: 'r1', label: 'Daily', basis: 'day', rateCents: 5500, count: 4, cappedHours: null }],
  },
  pickupLocation: 'Downtown',
  returnLocation: 'Downtown',
  pickupAt: '2026-10-01T13:30:00Z',
  returnAt: '2026-10-05T13:30:00Z',
  additionalDrivers: [
    {
      id: 'd1',
      name: 'Sam Vega',
      licenceNumber: 'FL V-1',
      licenceState: null,
      licenceExpiry: null,
      pricePerDayCents: 1200,
    },
  ],
  fees: [{ id: 'f1', label: 'Child seat', amountCents: 2500 }],
  verifications: ['identity'],
  pricing: {
    rentalSubtotalCents: 22000,
    discount: null,
    driversCents: 4800,
    feesCents: 2500,
    subtotalCents: 29300,
    taxRatePct: '7.00',
    taxCents: 2051,
    totalCents: 31351,
    depositCents: 35000,
  },
  payment: {
    state: 'unpaid' as const,
    paidCents: 0,
    refundedCents: 0,
    method: null,
    paidAt: null,
  },
  paymentPreference: null,
  notes: null,
  renterSubmitted: null,
  possibleDuplicates: [],
  declined: null,
  cancelled: null,
  contract: { signedAt: null, version: null },
  verification: null,
  confirmedAt: null,
  pickedUpAt: null,
  returnedAt: null,
  completedAt: null,
  pickupCondition: null,
  returnCondition: null,
  createdAt: '2026-09-22T10:00:00Z',
  updatedAt: '2026-09-22T10:00:00Z',
}

describe('toBooking', () => {
  it('translates the status slug, cents and nulls', () => {
    const booking = toBooking(wire)

    expect(booking.status).toBe('Confirmed')
    expect(booking.customer).toEqual({
      id: 'c1',
      name: 'Marisol Vega',
      email: 'marisol@example.com',
      phone: '+1 305 442 0118',
      dateOfBirth: '1991-04-17',
      address: undefined,
      licenceNumber: 'FL D-1204-889',
      licenceExpiry: '2029-03-01',
    })
    expect(booking.rate.rate).toBe(55)
    expect(booking.additionalDrivers[0].pricePerDay).toBe(12)
    expect(booking.fees[0].amount).toBe(25)
    expect(booking.pricing).toEqual({
      rentalSubtotal: 220,
      discount: null,
      drivers: 48,
      fees: 25,
      subtotal: 293,
      taxRatePct: 7,
      tax: 20.51,
      total: 313.51,
      deposit: 350,
    })
  })

  it('carries every combined rate and the discount tier, in dollars', () => {
    const combined = toBooking({
      ...wire,
      rate: {
        ...wire.rate,
        lines: [
          { optionId: 'w', label: 'Weekly', basis: 'week', rateCents: 220000, count: 1, cappedHours: null },
          { optionId: 'd', label: 'Daily', basis: 'day', rateCents: 40000, count: 3, cappedHours: null },
        ],
      },
      pricing: { ...wire.pricing, discount: { minDays: 7, percentOff: 15, amountCents: 51000 } },
    })

    expect(combined.rate.lines.map((l) => [l.label, l.rate, l.count])).toEqual([
      ['Weekly', 2200, 1],
      ['Daily', 400, 3],
    ])
    expect(combined.pricing.discount).toEqual({ minDays: 7, percentOff: 15, amount: 510 })
  })

  it('drops a deleted vehicle to undefined', () => {
    expect(toBooking({ ...wire, vehicleId: null }).vehicleId).toBeUndefined()
  })

  it('shows a status it does not know as itself rather than inventing one', () => {
    // Folding it into a known status would state something about the rental the API never
    // said — the badge falls back to neutral colours instead.
    expect(toBooking({ ...wire, status: 'partially_refunded' }).status).toBe('partially_refunded')
  })
})

describe('toBookingLists', () => {
  const now = new Date('2026-10-03T00:00:00Z')

  it('keeps open rentals upcoming and moves finished or returned ones to recent', () => {
    const open = toBooking(wire)
    const returned = toBooking({
      ...wire,
      reference: 'BK-2',
      pickupAt: '2026-09-01T00:00:00Z',
      returnAt: '2026-09-04T00:00:00Z',
    })
    const cancelled = toBooking({ ...wire, reference: 'BK-3', status: 'cancelled' })

    const lists = toBookingLists([open, returned, cancelled], now)

    expect(lists.upcoming.map((b) => b[1])).toEqual(['BK-10000'])
    expect(lists.recent.map((b) => b[1])).toEqual(['BK-2', 'BK-3'])
    // The car is still spoken for by the returned rental's window, but not by the cancellation.
    expect(lists.schedule.map((i) => i.reference)).toEqual(['BK-10000', 'BK-2'])
  })

  it('says which windows are only asked for, so a strip can tell a request from a booking', () => {
    const asked = toBooking({ ...wire, reference: 'BK-4', status: 'pending' })

    const lists = toBookingLists([toBooking(wire), asked], now)

    expect(lists.schedule.map((i) => [i.reference, i.pending])).toEqual([
      ['BK-10000', false],
      ['BK-4', true],
    ])
  })

  it('renders a tuple the list can filter on', () => {
    const [row] = toBookingLists([toBooking(wire)], now).upcoming

    expect(row).toEqual([
      'Marisol Vega',
      'BK-10000',
      'Toyota Camry',
      'ABC1234',
      // Both ends carry a time; the run-time zone decides the clock, so it is not pinned here.
      expect.stringMatching(/^Oct 1 · \d{1,2}:\d{2} [AP]M → Oct 5 · \d{1,2}:\d{2} [AP]M$/),
      '4 days',
      'Downtown',
      'Confirmed',
      '$313.51',
      // The real instants ride along so the list filters on dates that know their year,
      // rather than re-parsing the year-less window above.
      '2026-10-01T13:30:00Z',
      '2026-10-05T13:30:00Z',
      // The cover shot is joined in from the fleet at render time, not here.
      undefined,
      // Identifies the car for that join — plates are not unique, so they cannot key it.
      'v1',
      // Unpaid and unsigned in the fixture, so not ready for the keys.
      false,
      // Nobody turned it down.
      false,
    ])
  })
})

describe('toInterval', () => {
  it('maps the schedule endpoint onto the portal interval', () => {
    expect(
      toInterval({
        reference: 'BK-1',
        vehicleId: 'v1',
        vehiclePlate: 'ABC1234',
        pickupAt: 'a',
        returnAt: 'b',
      }),
    ).toEqual({ reference: 'BK-1', vehicleId: 'v1', plate: 'ABC1234', from: 'a', to: 'b' })
  })
})

describe('toBookingPayload', () => {
  const input: BookingInput = {
    customer: {
      name: ' Marisol Vega ',
      email: 'marisol@example.com',
      phone: '+1 305 442 0118',
      dateOfBirth: '',
      address: '  ',
      licenceNumber: 'FL D-1204-889',
      licenceExpiry: undefined,
    },
    vehicleId: 'v1',
    pickupLocation: 'Downtown',
    returnLocation: 'Downtown',
    pickupAt: '2026-10-01T13:30:00Z',
    returnAt: '2026-10-05T13:30:00Z',
    additionalDrivers: [
      { id: 'd1', name: 'Sam', licenceNumber: 'X', licenceState: '', licenceExpiry: '', pricePerDay: 12.5 },
    ],
    fees: [{ id: 'f1', label: 'Seat', amount: 25 }],
    verifications: ['identity', 'insurance'],
  }

  it('sends cents, nulls for blank optionals, and no customerId unless one was picked', () => {
    const payload = toBookingPayload(input)

    expect('customerId' in payload).toBe(false)
    expect(payload.customer).toEqual({
      name: 'Marisol Vega',
      email: 'marisol@example.com',
      phone: '+1 305 442 0118',
      dateOfBirth: null,
      address: null,
      licenceNumber: 'FL D-1204-889',
      licenceExpiry: null,
    })
    expect(payload.additionalDrivers[0].pricePerDayCents).toBe(1250)
    expect(payload.fees[0].amountCents).toBe(2500)
    expect(toBookingPayload({ ...input, customerId: 'c1' }).customerId).toBe('c1')
  })
})

describe('toBookingListQuery', () => {
  const NO_FILTERS: BookingFilters = {
    search: '',
    status: 'Any',
    location: 'All',
    pickup: { from: '', to: '' },
    make: 'All',
    durationBand: 'Any',
    valueBands: [],
  }
  const base = { tab: 'Upcoming' as const, sort: 'newest' as const, page: 1, pageSize: 25 }

  it('sends nothing but paging when no filter is set', () => {
    // "Any"/"All"/an empty range are the absence of a constraint, not a value to filter on.
    // Strict, because toEqual treats a key set to undefined as absent — and `status: undefined`
    // is exactly what a forgotten guard produces.
    expect(toBookingListQuery({ ...base, filters: NO_FILTERS })).toStrictEqual({
      limit: 25,
      offset: 0,
      tab: 'upcoming',
      sort: 'newest',
    })
  })

  it('asks for declined reservations apart from other cancellations', () => {
    // The API stores both as `cancelled`; the list labels them apart, so the filter has to too.
    const status = (value: BookingFilters['status']) => {
      const { status, declined } = toBookingListQuery({ ...base, filters: { ...NO_FILTERS, status: value } })
      return { status, declined }
    }

    expect(status('Declined')).toStrictEqual({ status: 'cancelled', declined: true })
    expect(status('Cancelled')).toStrictEqual({ status: 'cancelled', declined: false })
    expect(status('Confirmed')).toStrictEqual({ status: 'confirmed', declined: undefined })
  })

  it('translates each control to its query param', () => {
    const query = toBookingListQuery({
      ...base,
      tab: 'Today',
      sort: 'totalDesc',
      page: 3,
      filters: {
        search: '  marisol  ',
        status: 'Confirmed',
        location: 'Miami Beach',
        pickup: { from: '2026-10-01', to: '2026-10-31' },
        make: 'Honda',
        durationBand: '3-6',
        valueBands: ['0-250', '1000+'],
      },
    })

    expect(query).toStrictEqual({
      limit: 25,
      offset: 50,
      tab: 'today',
      sort: 'totalDesc',
      search: 'marisol',
      status: 'confirmed',
      location: 'Miami Beach',
      pickupFrom: '2026-10-01',
      pickupTo: '2026-10-31',
      make: 'Honda',
      durationBand: '3-6',
      valueBand: ['0-250', '1000+'],
    })
  })

  it('drops a search of only spaces', () => {
    const query = toBookingListQuery({ ...base, filters: { ...NO_FILTERS, search: '   ' } })

    expect(query).not.toHaveProperty('search')
  })

  it('sends either end of the pickup range on its own', () => {
    const from = toBookingListQuery({
      ...base,
      filters: { ...NO_FILTERS, pickup: { from: '2026-10-01', to: '' } },
    })

    expect(from.pickupFrom).toBe('2026-10-01')
    expect(from).not.toHaveProperty('pickupTo')
  })

  it('sends no tab for All, which the API reads as the whole book', () => {
    expect(toBookingListQuery({ ...base, tab: 'All', filters: NO_FILTERS })).toStrictEqual({
      limit: 25,
      offset: 0,
      sort: 'newest',
    })
  })

  it('narrows to one customer for their own page, and never otherwise', () => {
    const theirs = toBookingListQuery({ ...base, tab: 'All', filters: { ...NO_FILTERS, customerId: 'c1' } })

    expect(theirs.customerId).toBe('c1')
    expect(toBookingListQuery({ ...base, filters: NO_FILTERS })).not.toHaveProperty('customerId')
  })
})

describe('toTabCounts', () => {
  it('counts All as upcoming plus recent, which split the book between them', () => {
    const counts = toTabCounts({ upcoming: 2, today: 1, recent: 5, overdue: 1 })

    expect(counts.All).toBe(7)
    // The API still splits the book in two to count it; the portal has no tab for the second half.
    expect(Object.keys(counts)).toEqual(['All', 'Upcoming', 'Today', 'Overdue'])
  })

  it('carries how many reservations are waiting for an answer, for the sidebar', () => {
    const stats = toBookingStats({
      openBookings: 4,
      startingSoon: 1,
      expectedRevenueCents: 120_000,
      needsAttention: 2,
      unpaid: 1,
      unsigned: 1,
      ready: 1,
      pending: 3,
      tabCounts: { upcoming: 4, today: 0, recent: 2, overdue: 0 },
    })

    expect(stats.pending).toBe(3)
  })
})

describe('toBookingFilterQuery', () => {
  it('keeps the filters and drops paging, which the counts endpoints do not take', () => {
    const query = toBookingFilterQuery({
      search: 'marisol',
      status: 'Any',
      location: 'Miami Beach',
      pickup: { from: '', to: '' },
      make: 'All',
      durationBand: 'Any',
      valueBands: [],
    })

    expect(query).toStrictEqual({ search: 'marisol', location: 'Miami Beach' })
  })
})

/** Only the fields the assertions touch; the rest is boilerplate the API always sends. */
function verificationWire(overrides: Partial<VerificationWire> = {}): VerificationWire {
  return {
    id: 's1',
    customerId: 'cus_1',
    status: 'running',
    failureReason: null,
    recordsFound: false,
    hasReport: false,
    canReorder: false,
    reused: false,
    completedAt: null,
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
    ...overrides,
  }
}

describe('toVerification', () => {
  it('turns the wire nulls into absent fields', () => {
    const verification = toVerification(verificationWire())

    // toStrictEqual, not toEqual: the latter ignores undefined keys, so a mapper that dropped
    // a field entirely would pass.
    expect(verification).toStrictEqual({
      id: 's1',
      customerId: 'cus_1',
      status: 'running',
      failureReason: undefined,
      recordsFound: false,
      hasReport: false,
      canReorder: false,
      reused: false,
      policy: undefined,
      validUntil: undefined,
      expired: false,
      completedAt: undefined,
      createdAt: '2026-09-20T10:00:00Z',
      updatedAt: '2026-09-20T10:00:00Z',
    })
  })

  it('keeps how long an insurance check stands, and whether it has run out', () => {
    const verification = toVerification(verificationWire({ validUntil: '2026-10-05', expired: true }))

    expect(verification).toMatchObject({ validUntil: '2026-10-05', expired: true })
  })

  it('names the policy an insurance verdict was read from, in words rather than a slug', () => {
    const verification = toVerification(
      verificationWire({
        status: 'clear',
        policy: { carrier: 'state-farm', policyNumber: 'SF-123456', expiresOn: '2027-01-01' },
      }),
    )

    expect(verification.policy).toEqual({
      carrier: 'State Farm',
      policyNumber: 'SF-123456',
      expiresOn: '2027-01-01',
    })
  })

  it('keeps the verdict when the API sends one', () => {
    const verification = toVerification(
      verificationWire({
        status: 'consider',
        recordsFound: true,
        hasReport: true,
        completedAt: '2026-09-21T08:00:00Z',
      }),
    )

    expect(verification.status).toBe('consider')
    expect(verification.recordsFound).toBe(true)
    expect(verification.hasReport).toBe(true)
  })
})

describe('isReadyForPickup', () => {
  const booking = (state: PaymentState, signedAt: string | null) =>
    toBooking({
      ...wire,
      payment: { ...wire.payment, state },
      contract: { signedAt, version: null },
    })

  it('needs the money taken and the contract signed', () => {
    expect(isReadyForPickup(booking('paid', '2026-09-22T10:00:00Z'))).toBe(true)
  })

  it('does not treat a held deposit or a refund as settlement', () => {
    // Matches the API's own predicate — anything looser and the badge would disagree with the
    // "ready" count on the stat card.
    for (const state of ['deposit_held', 'refunded', 'unpaid'] as PaymentState[]) {
      expect(isReadyForPickup(booking(state, '2026-09-22T10:00:00Z'))).toBe(false)
    }
  })

  it('is false while the contract is unsigned, however the money stands', () => {
    expect(isReadyForPickup(booking('paid', null))).toBe(false)
  })

  it('ignores the background check, which is informational and gates nothing', () => {
    // Records found, no check at all - neither changes whether the keys can be handed over.
    expect(
      isReadyForPickup(
        toBooking({
          ...wire,
          verifications: ['background'],
          payment: { ...wire.payment, state: 'paid' },
          contract: { signedAt: '2026-09-22T10:00:00Z', version: 'v3' },
          verification: null,
        }),
      ),
    ).toBe(true)
  })
})

describe("a renter's own request", () => {
  it('carries how they asked to pay and their note through to the details page', () => {
    const booking = toBooking({
      ...wire,
      status: 'pending',
      paymentPreference: 'cash',
      notes: 'Arriving on a late flight.',
    })

    expect(buildBookingDetails(bookingToTuple(booking), booking).request).toEqual({
      paymentPreference: 'cash',
      notes: 'Arriving on a late flight.',
    })
  })

  it('has none on a booking taken at the counter', () => {
    // The API sends both as null there; mapped to a request, every booking would show the banner.
    const booking = toBooking(wire)

    expect(buildBookingDetails(bookingToTuple(booking), booking).request).toBeUndefined()
  })

  it('is dropped once the reservation is answered', () => {
    // The banner is a prompt to decide; the API still returns both fields after that.
    for (const status of ['confirmed', 'cancelled']) {
      const booking = toBooking({ ...wire, status, paymentPreference: 'cash', notes: 'Late flight.' })

      expect(buildBookingDetails(bookingToTuple(booking), booking).request).toBeUndefined()
    }
  })
})

describe('a declined reservation', () => {
  const declined = {
    reason: 'dates_unavailable' as const,
    message: 'It is free again from the 20th.',
    at: '2026-10-06T15:00:00Z',
    // The API's answer on whether the decline can still be undone; the Restore button follows it.
    restorable: true,
  }

  it('carries why it was turned down to the list row and the details page', () => {
    const booking = toBooking({ ...wire, status: 'cancelled', declined })

    expect(booking.declined).toEqual(declined)
    expect(bookingToTuple(booking)[14]).toBe(true)
    expect(buildBookingDetails(bookingToTuple(booking), booking).declined).toEqual(declined)
  })

  it('leaves a cancelled rental, and a decline with no message, without one', () => {
    expect(toBooking({ ...wire, status: 'cancelled' }).declined).toBeUndefined()
    expect(bookingToTuple(toBooking({ ...wire, status: 'cancelled' }))[14]).toBe(false)
    const silent = toBooking({ ...wire, declined: { ...declined, message: null } })
    expect(silent.declined).toEqual({ reason: 'dates_unavailable', at: declined.at, restorable: true })
  })

  it('sends a blank message as none, so the renter is not emailed an empty paragraph', () => {
    expect(toDeclinePayload({ reason: 'other', message: '   ' })).toEqual({ reason: 'other', message: null })
    expect(toDeclinePayload({ reason: 'other', message: ' Sorry. ' })).toEqual({
      reason: 'other',
      message: 'Sorry.',
    })
  })
})

describe('the pickup and return cards', () => {
  const detailsOf = (changes: Partial<BookingWire> = {}) => {
    const booking = toBooking({ ...wire, ...changes })
    return buildBookingDetails(bookingToTuple(booking), booking)
  }

  it('carry when the car really changed hands, and nothing until it has', () => {
    expect(detailsOf()).toMatchObject({ pickedUpAt: undefined, returnedAt: undefined })

    const moved = { pickedUpAt: '2026-10-01T15:42:00Z', returnedAt: '2026-10-05T12:10:00Z' }
    expect(detailsOf({ status: 'returned', ...moved })).toMatchObject(moved)
  })

  it('give the rental its real length, to the minute', () => {
    const length = (days: number, hours: number, minutes: number) => ({ days, hours, minutes })
    expect(detailsOf().duration).toEqual(length(4, 0, 0))
    // Rounded to whole days this read "4 days", hiding the hours a late return is billed for.
    expect(detailsOf({ returnAt: '2026-10-05T17:30:00Z' }).duration).toEqual(length(4, 4, 0))
    expect(detailsOf({ returnAt: '2026-10-01T19:30:00Z' }).duration).toEqual(length(0, 6, 0))
    // Once the car is back it is what happened, not what was booked.
    const moved = { pickedUpAt: '2026-10-01T15:42:00Z', returnedAt: '2026-10-05T12:10:00Z' }
    expect(detailsOf({ status: 'returned', ...moved }).duration).toEqual(length(3, 20, 28))
  })

  it('invent no desk or agent', () => {
    // There is neither on record: the desk number used to be derived from the booking reference.
    const details = detailsOf()
    expect(details).not.toHaveProperty('counter')
    expect(details).not.toHaveProperty('agent')
  })
})

describe('booking details renter', () => {
  it('carries the date of birth an insurance check matches on', () => {
    // Dropped here, the details page sent an empty date and the API answered with a 422.
    const booking = toBooking({ ...wire, customer: { ...wire.customer, dateOfBirth: '1991-04-17' } })

    expect(buildBookingDetails(bookingToTuple(booking), booking).renter.dateOfBirth).toBe('1991-04-17')
  })
})

describe('toBookingPayload agreement template', () => {
  const input: BookingInput = {
    customer: {
      name: 'Marisol Vega',
      email: 'marisol@example.com',
      phone: '+1 305 442 0118',
      dateOfBirth: '1991-04-17',
      licenceNumber: 'X',
    },
    vehicleId: 'v1',
    pickupLocation: 'Downtown',
    returnLocation: 'Downtown',
    pickupAt: '2026-10-01T13:30:00Z',
    returnAt: '2026-10-05T13:30:00Z',
    additionalDrivers: [],
    fees: [],
    verifications: [],
  }

  it('names no template, so every new booking starts on the company default', () => {
    // The terms are changed from the booking itself; the API reads a missing id as the default.
    expect('agreementTemplateId' in toBookingPayload(input)).toBe(false)
  })
})

describe('a cancelled booking', () => {
  const cancelled = { reason: 'renter_request' as const, message: null, at: '2026-10-09T15:00:00Z' }

  it('carries why it was cancelled, apart from a decline', () => {
    const booking = toBooking({ ...wire, status: 'cancelled', cancelled })

    expect(booking.cancelled).toEqual({
      reason: 'renter_request',
      message: undefined,
      at: '2026-10-09T15:00:00Z',
    })
    expect(booking.declined).toBeUndefined()
    expect(toBooking(wire).cancelled).toBeUndefined()
  })

  it('reads what the cancellation did with the money, in currency units', () => {
    const result = toCancelledBooking({
      ...wire,
      status: 'cancelled',
      cancelled,
      emailQueued: true,
      refundedCents: 21540,
      refundByHandCents: 3000,
      depositReleased: true,
    })

    expect(result).toMatchObject({
      emailQueued: true,
      refunded: 215.4,
      refundByHand: 30,
      depositReleased: true,
    })
    expect(result.booking.status).toBe('Cancelled')
  })

  it('sends what is kept in whole cents, and a blank message as none', () => {
    // 19.99 * 100 is 1998.9999999999998 in floating point.
    expect(toCancelPayload({ reason: 'no_show', message: '  ', keep: 19.99, requestId: 'r1' })).toEqual({
      reason: 'no_show',
      message: null,
      keepCents: 1999,
      requestId: 'r1',
    })
  })
})

describe('toActivityEvent', () => {
  it('reads every amount in currency units, whatever the action calls it', () => {
    const event = toActivityEvent({
      id: 'e1',
      type: 'dates_changed',
      at: '2026-10-14T03:44:00Z',
      actor: { kind: 'staff', name: 'Pat Owner' },
      detail: {
        previousTotalCents: 23540,
        totalCents: 35310,
        returnAt: '2026-10-26T14:00:00Z',
        added: ['Sam Okafor'],
      },
    })

    expect(event).toEqual({
      id: 'e1',
      type: 'dates_changed',
      at: '2026-10-14T03:44:00Z',
      actor: { kind: 'staff', name: 'Pat Owner' },
      detail: {
        previousTotal: 235.4,
        total: 353.1,
        returnAt: '2026-10-26T14:00:00Z',
        added: ['Sam Okafor'],
      },
    })
  })

  it('leaves the renter and the system without a name, and an old entry without a detail', () => {
    const event = toActivityEvent({
      id: 'e2',
      type: 'payment_received',
      at: '2026-10-14T03:44:00Z',
      actor: { kind: 'renter', name: null },
      detail: {},
    })

    expect(event.actor).toEqual({ kind: 'renter', name: undefined })
    expect(event.detail).toEqual({})
  })
})

describe('a change of dates or vehicle', () => {
  it('reads the quote in currency units', () => {
    const quote = toChangeQuote({
      pickupAt: '2026-10-20T14:00:00Z',
      returnAt: '2026-10-26T14:00:00Z',
      vehicleId: 'v2',
      vehicleName: 'Ford Explorer',
      vehiclePlate: 'SUV4321',
      previousTotalCents: 23540,
      totalCents: 35310,
      lines: [{ optionId: 'o1', label: 'Daily', basis: 'day', rateCents: 5500, count: 6, cappedHours: null }],
      previousDepositCents: 35000,
      depositCents: 20000,
      balanceCents: 11770,
      overpaidCents: 0,
      voidsAgreement: true,
      withdrawsLink: false,
      releasesDeposit: true,
      emailsRenter: true,
    })

    expect(quote).toMatchObject({
      vehicleId: 'v2',
      previousTotal: 235.4,
      total: 353.1,
      previousDeposit: 350,
      deposit: 200,
      balance: 117.7,
      overpaid: 0,
      voidsAgreement: true,
      releasesDeposit: true,
    })
    expect(quote.lines).toEqual([
      { optionId: 'o1', label: 'Daily', basis: 'day', rate: 55, count: 6, cappedHours: undefined },
    ])
  })

  it('sends only what is changing, since the API refuses a field it does not know', () => {
    expect(toChangeQuotePayload({ returnAt: '2026-10-26T14:00:00Z' })).toEqual({
      returnAt: '2026-10-26T14:00:00Z',
    })
    expect(toChangeQuotePayload({ vehicleId: 'v2', keepPrice: true })).toEqual({
      vehicleId: 'v2',
      keepPrice: true,
    })
    expect(toChangeQuotePayload({ vehicleId: 'v2', keepPrice: false })).toEqual({ vehicleId: 'v2' })
  })

  it('sends the drivers as the whole list, in cents, and an empty one to take them all off', () => {
    const sam = {
      id: 'd1',
      name: ' Sam Okafor ',
      licenceNumber: ' FL 9911 ',
      licenceState: '',
      licenceExpiry: '',
      pricePerDay: 19.99,
    }

    expect(toChangeQuotePayload({ additionalDrivers: [sam] })).toEqual({
      additionalDrivers: [
        {
          id: 'd1',
          name: 'Sam Okafor',
          licenceNumber: 'FL 9911',
          licenceState: null,
          licenceExpiry: null,
          pricePerDayCents: 1999,
        },
      ],
    })
    // Left out, the booking keeps its drivers; sent empty, it loses them.
    expect(toChangeQuotePayload({ additionalDrivers: [] })).toEqual({ additionalDrivers: [] })
    expect(toChangeQuotePayload({ returnAt: '2026-10-26T14:00:00Z' })).not.toHaveProperty('additionalDrivers')
  })

  it('sends the quoted total back in whole cents, so it matches what the API gave', () => {
    // 19.99 * 100 is 1998.9999999999998 in floating point.
    expect(toChangePayload({ vehicleId: 'v2' }, 19.99)).toEqual({ vehicleId: 'v2', totalCents: 1999 })
  })

  it('reads what the change took back with it', () => {
    const result = toChangedBooking({
      ...wire,
      emailQueued: false,
      agreementVoided: true,
      depositReleased: true,
    })

    expect(result).toMatchObject({ emailQueued: false, agreementVoided: true, depositReleased: true })
    expect(result.booking.reference).toBe('BK-10000')
  })
})

describe('a renter whose details differ from the customer on file', () => {
  const typed = {
    name: 'Sam Okafor',
    email: 'marisol@example.com',
    phone: '+1 512 555 0188',
    dateOfBirth: '1985-02-11',
    address: '41 Rainey St',
    licenceNumber: 'TX 1',
    licenceExpiry: null,
  }

  it('reaches the details page beside the customer, for staff to settle', () => {
    const booking = toBooking({ ...wire, status: 'pending', renterSubmitted: typed })

    expect(buildBookingDetails(bookingToTuple(booking), booking).renterMismatch).toEqual({
      onFile: booking.customer,
      submitted: { ...typed, licenceExpiry: undefined },
    })
  })

  it('is absent on every other booking', () => {
    const booking = toBooking(wire)

    expect(buildBookingDetails(bookingToTuple(booking), booking).renterMismatch).toBeUndefined()
  })

  it('holds back possible duplicates until the mismatch is settled', () => {
    // Until staff say who booked, the customer on file may not be the renter at all.
    const twin = { customer: { ...wire.customer, id: 'c2' }, reasons: ['licence' as const] }
    const details = (renterSubmitted: typeof typed | null) => {
      const booking = toBooking({ ...wire, renterSubmitted, possibleDuplicates: [twin] })
      return buildBookingDetails(bookingToTuple(booking), booking)
    }

    expect(details(typed).renterDuplicates).toEqual([])
    expect(details(null).renterDuplicates).toEqual([
      { customer: expect.objectContaining({ id: 'c2' }), reasons: ['licence'] },
    ])
  })
})

describe('toBookingPayload shared licence', () => {
  const input: BookingInput = {
    customer: {
      name: 'Marisol Vega',
      email: 'marisol@example.com',
      phone: '+1 305 442 0118',
      dateOfBirth: '1991-04-17',
      licenceNumber: 'X',
    },
    vehicleId: 'v1',
    pickupLocation: 'Downtown',
    returnLocation: 'Downtown',
    pickupAt: '2026-10-01T13:30:00Z',
    returnAt: '2026-10-05T13:30:00Z',
    additionalDrivers: [],
    fees: [],
    verifications: [],
  }

  it('is sent only once the counter has confirmed a different person', () => {
    expect('allowSharedLicence' in toBookingPayload(input)).toBe(false)
    expect(toBookingPayload({ ...input, allowSharedLicence: true }).allowSharedLicence).toBe(true)
  })
})
