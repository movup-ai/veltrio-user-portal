import { describe, expect, it } from 'vitest'
import { defaultTripWindow } from './booking.trip-defaults'

// Local-time constructors: the form's date and time inputs are wall-clock, not UTC.
const at = (h: number, m: number, s = 0) => new Date(2026, 9, 1, h, m, s)

describe('defaultTripWindow', () => {
  it('starts at the next half-hour slot and runs one day', () => {
    expect(defaultTripWindow(at(9, 10))).toEqual({
      pickupDate: '2026-10-01',
      pickupTime: '09:30',
      returnDate: '2026-10-02',
      returnTime: '09:30',
    })
  })

  it('keeps a time already on a slot', () => {
    expect(defaultTripWindow(at(14, 0)).pickupTime).toBe('14:00')
  })

  it('moves on from a slot that has already begun', () => {
    // 09:30:01 is past 09:30; offering 09:30 would default the pickup into the past.
    expect(defaultTripWindow(at(9, 30, 1)).pickupTime).toBe('10:00')
  })

  it('rolls into tomorrow late at night', () => {
    expect(defaultTripWindow(at(23, 45))).toEqual({
      pickupDate: '2026-10-02',
      pickupTime: '00:00',
      returnDate: '2026-10-03',
      returnTime: '00:00',
    })
  })
})
