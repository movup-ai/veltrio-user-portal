import { describe, expect, it } from 'vitest'
import { toBooking, toBookingLists, toBookingPayload, toInterval, type BookingWire } from './booking.mapper'
import type { BookingInput } from '../types/booking.types'

const wire: BookingWire = {
  id: 'b1',
  reference: 'BK-10000',
  status: 'deposit_due',
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
  createdAt: '2026-09-22T10:00:00Z',
  updatedAt: '2026-09-22T10:00:00Z',
}

describe('toBooking', () => {
  it('translates the status slug, cents and nulls', () => {
    const booking = toBooking(wire)

    expect(booking.status).toBe('Deposit due')
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
    // Folding it into "Deposit due" would claim the rental is awaiting payment when the API
    // said something else entirely — a false statement about money.
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
    const refunded = toBooking({ ...wire, reference: 'BK-3', status: 'refunded' })

    const lists = toBookingLists([open, returned, refunded], now)

    expect(lists.upcoming.map((b) => b[1])).toEqual(['BK-10000'])
    expect(lists.recent.map((b) => b[1])).toEqual(['BK-2', 'BK-3'])
    // The car is still spoken for by the returned rental's window, but not by the refund.
    expect(lists.schedule.map((i) => i.reference)).toEqual(['BK-10000', 'BK-2'])
  })

  it('renders a tuple the list can filter on', () => {
    const [row] = toBookingLists([toBooking(wire)], now).upcoming

    expect(row).toEqual([
      'Marisol Vega',
      'BK-10000',
      'Toyota Camry',
      'ABC1234',
      expect.stringMatching(/^Oct 1 · \d{2}:\d{2} → Oct 5$/),
      '4 days',
      'Downtown',
      'Deposit due',
      '$313.51',
      // The real instants ride along so the list filters on dates that know their year,
      // rather than re-parsing the year-less window above.
      '2026-10-01T13:30:00Z',
      '2026-10-05T13:30:00Z',
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
