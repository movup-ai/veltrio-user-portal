import { describe, expect, it } from 'vitest'
import { dateRangeLabel } from './date-range'

const day = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`

describe('dateRangeLabel', () => {
  it('joins the two ends of a range', () => {
    expect(dateRangeLabel({ from: '2026-09-10', to: '2026-09-20' }, day, 'Any dates')).toBe('9/10 – 9/20')
  })

  it('reads one day once, and an open range by the end it has', () => {
    expect(dateRangeLabel({ from: '2026-09-10', to: '2026-09-10' }, day, 'Any dates')).toBe('9/10')
    expect(dateRangeLabel({ from: '2026-09-10', to: '' }, day, 'Any dates')).toBe('9/10')
  })

  it('falls back to the placeholder for an empty range', () => {
    expect(dateRangeLabel({ from: '', to: '' }, day, 'Any dates')).toBe('Any dates')
  })
})
