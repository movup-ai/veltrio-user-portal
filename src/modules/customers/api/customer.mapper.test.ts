import { AxiosError, type AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import {
  toCustomer,
  toCustomerBookingDocument,
  toCustomerConflict,
  toCustomerDetail,
  toCustomerListQuery,
  toCustomerMatchPayload,
  toCustomerPayload,
  toCustomerProfilePayload,
  type CustomerDetailWire,
  type CustomerWire,
} from './customer.mapper'

const wire: CustomerWire = {
  id: 'c1',
  name: 'Marisol Vega',
  email: 'marisol@example.com',
  phone: '+1 305 442 0118',
  dateOfBirth: '1991-04-17',
  address: null,
  licenceNumber: 'FL D-1204-889',
  licenceExpiry: null,
  gender: 'non_binary',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
}

function refusal(status: number, error: unknown): AxiosError {
  const response = { status, data: { error } } as AxiosResponse
  return new AxiosError('refused', 'ERR_BAD_REQUEST', undefined, undefined, response)
}

describe('toCustomerDetail', () => {
  it('reads cents as dollars and the API slug as the portal reason', () => {
    const detail: CustomerDetailWire = {
      ...wire,
      rentals: 3,
      lifetimeValueCents: 124_050,
      possibleDuplicate: true,
      duplicates: [{ customer: { ...wire, id: 'c2' }, reasons: ['name_and_dob', 'phone'] }],
    }

    const customer = toCustomerDetail(detail)

    expect(customer.lifetimeValue).toBe(1240.5)
    expect(customer.address).toBeUndefined()
    expect(customer.duplicates).toEqual([
      { customer: expect.objectContaining({ id: 'c2' }), reasons: ['nameAndDob', 'phone'] },
    ])
  })
})

describe('toCustomerConflict', () => {
  it('reads the customer on file out of a refused save', () => {
    const error = refusal(409, {
      code: 'customer_licence_on_file',
      message: 'A customer with this licence number is on file',
      details: { customer: wire },
    })

    expect(toCustomerConflict(error)).toEqual({
      code: 'customer_licence_on_file',
      customer: expect.objectContaining({ id: 'c1', name: 'Marisol Vega' }),
    })
  })

  it('leaves every other failure to be reported as a failure', () => {
    // Another 409, and a conflict code with nobody attached: neither is a question to ask.
    expect(toCustomerConflict(refusal(409, { code: 'vehicle_unavailable' }))).toBeUndefined()
    expect(toCustomerConflict(refusal(409, { code: 'customer_email_taken' }))).toBeUndefined()
    expect(toCustomerConflict(new Error('offline'))).toBeUndefined()
  })
})

describe('customer queries', () => {
  it('sends only what was typed to the match check', () => {
    expect(
      toCustomerMatchPayload({ name: ' Marisol ', email: '', licenceNumber: '  ', excludeId: 'c1' }),
    ).toEqual({ name: 'Marisol', excludeId: 'c1' })
  })

  it('pages the book by limit and offset, in the order asked for', () => {
    expect(toCustomerListQuery({ search: '  ', sort: 'newest', page: 3, pageSize: 25 })).toEqual({
      limit: 25,
      offset: 50,
      sort: 'newest',
    })
    expect(toCustomerListQuery({ search: ' vega ', sort: 'valueDesc', page: 1, pageSize: 10 })).toEqual({
      limit: 10,
      offset: 0,
      search: 'vega',
      sort: 'valueDesc',
    })
  })
})

describe('gender', () => {
  it('is read from the API slug and sent back as one', () => {
    expect(toCustomer(wire).gender).toBe('nonBinary')
    expect(toCustomer({ ...wire, gender: null }).gender).toBeUndefined()
    expect(toCustomerProfilePayload({ ...toCustomer(wire), gender: 'nonBinary' }).gender).toBe('non_binary')
    expect(toCustomerProfilePayload({ ...toCustomer(wire), gender: undefined }).gender).toBeNull()
  })

  it('stays out of the booking form payload, where the API refuses it', () => {
    expect('gender' in toCustomerPayload(toCustomer(wire))).toBe(false)
  })
})

describe('toCustomerBookingDocument', () => {
  it('keeps the reservation a scan came with beside the scan itself', () => {
    const document = toCustomerBookingDocument({
      id: 'doc7',
      kind: 'insurance',
      status: 'ready',
      name: 'policy.pdf',
      contentType: 'application/pdf',
      sizeBytes: 2048,
      createdAt: '2026-10-13T02:06:22Z',
      bookingReference: 'BK-10016',
    })

    expect(document).toEqual({
      id: 'doc7',
      kind: 'insurance',
      status: 'ready',
      name: 'policy.pdf',
      contentType: 'application/pdf',
      sizeBytes: 2048,
      createdAt: '2026-10-13T02:06:22Z',
      bookingReference: 'BK-10016',
    })
  })
})
