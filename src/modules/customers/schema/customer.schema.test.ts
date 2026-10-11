import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  customerFormValues,
  customerSchema,
  pickedDocuments,
  toCustomerInput,
  type CustomerFormValues,
} from './customer.schema'

// The message key stands in for its wording: this is about which rule fires, not the copy.
const schema = customerSchema(((key: string) => key) as never)

function scan(name: string) {
  const file = new File(['x'], name, { type: 'image/jpeg' })
  return { id: name, name, size: file.size, file }
}

const filled: CustomerFormValues = {
  name: 'Marisol Vega',
  email: 'marisol@example.com',
  phone: '+1 305 442 0118',
  gender: 'nonBinary',
  dateOfBirth: '1991-04-17',
  address: '18 Ocean Drive, Miami FL 33139',
  licenceNumber: 'FL D-1204-889',
  licenceExpiry: '',
  licenceDocument: null,
  insuranceDocument: null,
}

describe('customerSchema', () => {
  // The renter's age is measured from today.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-11T12:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('accepts what the reservation form asks, with the scans left for later', () => {
    expect(schema.safeParse(filled).success).toBe(true)
  })

  it('asks for a gender, which "prefer not to say" answers', () => {
    const blank = schema.safeParse({ ...filled, gender: '' })

    expect(blank.error?.issues.map((issue) => [issue.path[0], issue.message])).toEqual([
      ['gender', 'booking.customerGenderRequired'],
    ])
    expect(schema.safeParse({ ...filled, gender: 'undisclosed' }).success).toBe(true)
  })

  it('opens blank for a new customer and filled in for an existing one', () => {
    expect(customerFormValues().gender).toBe('')
    expect(customerFormValues({ ...toCustomerInput(filled), id: 'c1' })).toEqual(filled)
  })
})

describe('what the form sends', () => {
  it('drops a blank licence expiry and keeps the gender', () => {
    expect(toCustomerInput(filled)).toMatchObject({ gender: 'nonBinary', licenceExpiry: undefined })
  })

  it('hands over only the scans that were picked', () => {
    const licence = scan('licence.jpg')

    expect(pickedDocuments(filled)).toEqual({})
    expect(pickedDocuments({ ...filled, licenceDocument: licence })).toEqual({ licence: licence.file })
  })
})
