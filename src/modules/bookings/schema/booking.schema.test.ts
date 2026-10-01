import type { TFunction } from 'i18next'
import { describe, expect, it } from 'vitest'
import { bookingFormSchema } from './booking.schema'

// Messages are their keys here, so the assertion names the rule that fired.
const t = ((key: string) => key) as unknown as TFunction<'validation'>

// Every field present, as the form always sends them: a missing one would stop Zod before the
// window check, which the real form never does.
const BLANK = {
  pickupLocation: '',
  returnLocation: '',
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

function returnDateErrors(pickupDate: string, returnDate: string): string[] {
  const result = bookingFormSchema(t).safeParse({
    ...BLANK,
    pickupDate,
    pickupTime: '09:00',
    returnDate,
    returnTime: '09:00',
  })
  return result.success
    ? []
    : result.error.issues.filter((i) => i.path[0] === 'returnDate').map((i) => i.message)
}

describe('the rental window', () => {
  it('allows a rental of a full year', () => {
    expect(returnDateErrors('2027-01-01', '2028-01-01')).not.toContain('booking.rentalTooLong')
  })

  it('refuses one longer than a year on the return date, before any pricing runs', () => {
    expect(returnDateErrors('2027-01-01', '2028-01-02')).toContain('booking.rentalTooLong')
  })
})
