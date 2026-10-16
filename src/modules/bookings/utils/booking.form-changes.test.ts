import { describe, expect, it } from 'vitest'
import type { BookingFormValues } from '../schema/booking.schema'
import { bookingFormChanged } from './booking.form-changes'

const BLANK: BookingFormValues = {
  pickupLocation: '',
  returnLocation: '',
  pickupDate: '2026-10-18',
  pickupTime: '10:00',
  returnDate: '2026-10-21',
  returnTime: '10:00',
  vehicleId: '',
  customerId: '',
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  customerDob: '',
  customerAddress: '',
  licenceNumber: '',
  licenceExpiry: '',
  licenceDocument: null,
  insuranceDocument: null,
  verifications: [],
  additionalDrivers: [],
  fees: [],
}

const scan = (name: string) => ({ id: name, name, size: 1, file: new File(['x'], name) })

describe('bookingFormChanged', () => {
  it('lets an untouched wizard go without asking', () => {
    // A copy, as useWatch hands back: equal values, different objects.
    expect(bookingFormChanged(structuredClone(BLANK), BLANK)).toBe(false)
  })

  it('counts a vehicle picked through setValue, which RHF does not mark dirty', () => {
    expect(bookingFormChanged({ ...BLANK, vehicleId: 'v1' }, BLANK)).toBe(true)
  })

  it('counts a driver added to a list', () => {
    const driver = { id: 'd1', name: 'Ana', licenceNumber: '', pricePerDay: 12 }
    const values = { ...BLANK, additionalDrivers: [driver] } as BookingFormValues
    expect(bookingFormChanged(values, BLANK)).toBe(true)
  })

  it('tells two different scans apart', () => {
    const initial = { ...BLANK, licenceDocument: scan('a.png') }
    expect(bookingFormChanged({ ...BLANK, licenceDocument: scan('a.png') }, initial)).toBe(true)
    expect(bookingFormChanged({ ...initial }, initial)).toBe(false)
  })
})
