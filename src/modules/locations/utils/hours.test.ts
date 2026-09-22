import { describe, expect, it } from 'vitest'
import { formatRange, fromTimeValue, toTimeValue } from './hours'

describe('opening hours', () => {
  it('round-trips a time input value', () => {
    for (const value of ['00:00', '07:00', '09:30', '22:00', '23:59']) {
      expect(toTimeValue(fromTimeValue(value))).toBe(value)
    }
  })

  it('converts minutes from midnight', () => {
    expect(fromTimeValue('07:00')).toBe(420)
    expect(fromTimeValue('22:00')).toBe(1320)
    expect(toTimeValue(1440)).toBe('24:00')
  })

  it('formats a range for the active language', () => {
    expect(formatRange(420, 1320, 'en-US')).toBe('7:00 AM – 10:00 PM')
    expect(formatRange(420, 1320, 'es-ES')).toBe('7:00 – 22:00')
  })
})
