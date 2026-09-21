import { describe, expect, it } from 'vitest'
import { formatDay, parseDay, today } from './dates'

describe('calendar-day helpers', () => {
  it('parses a day in local time, not UTC', () => {
    const date = parseDay('2026-03-12')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(2)
    expect(date.getDate()).toBe(12)
  })

  it('round-trips without drifting a day', () => {
    for (const day of ['2026-01-01', '2026-03-12', '2026-12-31', '2026-06-30']) {
      expect(formatDay(parseDay(day))).toBe(day)
    }
  })

  it('formats single-digit months and days with padding', () => {
    expect(formatDay(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('returns today in the local timezone', () => {
    const now = new Date()
    expect(today()).toBe(formatDay(now))
  })
})
