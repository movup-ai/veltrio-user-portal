import { describe, expect, it } from 'vitest'
import {
  toBooking,
  toBookingFilterQuery,
  toBookingListQuery,
  toBookingLists,
  toBookingPayload,
  toInterval,
  toVerification,
  type BookingWire,
  type VerificationWire,
} from './booking.mapper'
import { isReadyForPickup, type BookingFilters, type BookingInput, type PaymentState } from '../types/booking.types'
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
    dateOfBirth: null,
    address: null,
    licenceNumber: 'FL D-1204-889',
    licenceExpiry: '2029-03-01',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  vehicleId: 'v1',
  vehicleName: 'Toyota Camry',
  vehiclePlate: 'ABC1234',
  rate: { optionId: 'r1', label: 'Daily', basis: 'day', rateCents: 5500, units: 4, includedMiles: 800 },
  pickupLocation: 'Downtown',
  returnLocation: 'Downtown',
  pickupAt: '2026-10-01T13:30:00Z',
  returnAt: '2026-10-05T13:30:00Z',
  additionalDrivers: [{ id: 'd1', name: 'Sam Vega', licenceNumber: 'FL V-1', pricePerDayCents: 1200 }],
  fees: [{ id: 'f1', label: 'Child seat', amountCents: 2500 }],
  verifications: ['identity'],
  pricing: {
    rentalSubtotalCents: 22000,
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
  contract: { signedAt: null, version: null },
  verification: null,
  pickedUpAt: null,
  returnedAt: null,
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
      dateOfBirth: undefined,
      address: undefined,
      licenceNumber: 'FL D-1204-889',
      licenceExpiry: '2029-03-01',
    })
    expect(booking.rate.rate).toBe(55)
    expect(booking.additionalDrivers[0].pricePerDay).toBe(12)
    expect(booking.fees[0].amount).toBe(25)
    expect(booking.pricing).toEqual({
      rentalSubtotal: 220,
      drivers: 48,
      fees: 25,
      subtotal: 293,
      taxRatePct: 7,
      tax: 20.51,
      total: 313.51,
      deposit: 350,
    })
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

  it('renders a tuple the list can filter on', () => {
    const [row] = toBookingLists([toBooking(wire)], now).upcoming

    expect(row).toEqual([
      'Marisol Vega',
      'BK-10000',
      'Toyota Camry',
      'ABC1234',
      // Both ends carry a time; the run-time zone decides the clock, so it is not pinned here.
      expect.stringMatching(/^Oct 1 · \d{2}:\d{2} → Oct 5 · \d{2}:\d{2}$/),
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
    rateOptionId: 'r1',
    pickupLocation: 'Downtown',
    returnLocation: 'Downtown',
    pickupAt: '2026-10-01T13:30:00Z',
    returnAt: '2026-10-05T13:30:00Z',
    additionalDrivers: [{ id: 'd1', name: 'Sam', licenceNumber: 'X', pricePerDay: 12.5 }],
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

  it('translates each control to its query param', () => {
    const query = toBookingListQuery({
      ...base,
      tab: 'Recent activity',
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
      tab: 'recent',
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
      completedAt: undefined,
      createdAt: '2026-09-20T10:00:00Z',
      updatedAt: '2026-09-20T10:00:00Z',
    })
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
    expect(isReadyForPickup(toBooking({ ...wire, verifications: ['background'],
      payment: { ...wire.payment, state: 'paid' },
      contract: { signedAt: '2026-09-22T10:00:00Z', version: 'v3' },
      verification: null }))).toBe(true)
  })
})

describe('booking details renter', () => {
  it('carries the date of birth an insurance check matches on', () => {
    // Dropped here, the details page sent an empty date and the API answered with a 422.
    const booking = toBooking({ ...wire, customer: { ...wire.customer, dateOfBirth: '1991-04-17' } })

    expect(buildBookingDetails(bookingToTuple(booking), booking).renter.dateOfBirth).toBe('1991-04-17')
  })
})
