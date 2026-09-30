import { describe, expect, it } from 'vitest'
import { customerLabel, customerSearchTerm } from './booking.customer-search'

const EDWARD = { name: 'Edward Thomas', email: 'edwardthomas7770@gmail.com' }

describe('customerSearchTerm', () => {
  it('lists the whole book once a renter has been picked', () => {
    // Narrowing to the person already chosen left the dropdown showing only them, so the
    // counter could not switch to anyone else without clearing the field first.
    expect(customerSearchTerm(customerLabel(EDWARD))).toBe('')
  })

  it('never sends a whole label, which matches nobody', () => {
    // The API matches a term against one column at a time, so a name-and-email string finds
    // no one — the box then reported "no matches" about the renter it was showing.
    expect(customerSearchTerm(customerLabel(EDWARD))).not.toContain('@')
  })

  it('narrows on typed text, so searching still works', () => {
    expect(customerSearchTerm('Edward')).toBe('Edward')
  })

  it('keeps narrowing for a renter whose name holds the separator', () => {
    // No trailing email, so this is someone typing a name — not a selection.
    expect(customerSearchTerm('Ann · Marie')).toBe('Ann · Marie')
  })

  it('treats a lone middot as typed text', () => {
    expect(customerSearchTerm('Jean·Luc')).toBe('Jean·Luc')
  })

  it('searches the book when the field is empty', () => {
    expect(customerSearchTerm('')).toBe('')
  })
})
