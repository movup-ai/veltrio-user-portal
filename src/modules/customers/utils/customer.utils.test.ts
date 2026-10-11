import { describe, expect, it } from 'vitest'
import type { CustomerRow } from '../types/customer.types'
import { customerRow, customersCsv, repeatRate } from './customer.utils'

const customer: CustomerRow = {
  id: 'c1',
  name: 'Marisol Vega',
  email: 'marisol@example.com',
  phone: '+1 305 442 0118',
  dateOfBirth: '1991-04-17',
  licenceNumber: 'FL D-1204-889',
  rentals: 2,
  lifetimeValue: 1240.5,
  possibleDuplicate: false,
}

const LABELS = { possibleDuplicate: 'Possible duplicate', lifetimeValue: '$1,240.50' }
const STATUS_CELL = 4

describe('customersCsv', () => {
  it('exports the table columns, with the email in a column of its own', () => {
    const rows = customersCsv([customer, { ...customer, id: 'c2', possibleDuplicate: true }], {
      header: ['Customer', 'Email', 'Phone', 'Driver licence', 'Rentals', 'Status', 'Lifetime value'],
      active: 'Active',
      possibleDuplicate: 'Possible duplicate',
      currency: (amount) => `$${amount.toFixed(2)}`,
    })

    expect(rows).toEqual([
      ['Customer', 'Email', 'Phone', 'Driver licence', 'Rentals', 'Status', 'Lifetime value'],
      ['Marisol Vega', 'marisol@example.com', '+1 305 442 0118', 'FL D-1204-889', '2', 'Active', '$1240.50'],
      [
        'Marisol Vega',
        'marisol@example.com',
        '+1 305 442 0118',
        'FL D-1204-889',
        '2',
        'Possible duplicate',
        '$1240.50',
      ],
    ])
  })
})

describe('repeatRate', () => {
  it('is measured over customers who have rented, not the whole book', () => {
    // Six customers, five of whom have rented and three of whom came back: 60%, not 50%.
    expect(repeatRate(3, 5)).toBe(60)
    expect(repeatRate(1, 3)).toBe(33)
    expect(repeatRate(0, 0)).toBe(0)
  })
})

describe('customerRow status', () => {
  it('reads Active unless another customer looks like the same person', () => {
    expect(customerRow(customer, LABELS, []).cells[STATUS_CELL]).toEqual({
      kind: 'badge',
      status: 'Active',
    })
  })

  it('flags a possible duplicate in the warning colours, under its own wording', () => {
    const cell = customerRow({ ...customer, possibleDuplicate: true }, LABELS, []).cells[STATUS_CELL]

    expect(cell).toEqual({ kind: 'badge', status: 'Verify docs', label: 'Possible duplicate' })
  })
})
