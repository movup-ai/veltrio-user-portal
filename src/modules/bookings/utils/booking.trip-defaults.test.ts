import { afterEach, describe, expect, it } from 'vitest'
import { useOrganizationStore } from '@/state/organization.store'
import type { OrganizationMembership } from '@/types/user'
import { defaultTripWindow } from './booking.trip-defaults'

function companyIn(timezone: string) {
  useOrganizationStore.setState({ membership: { timezone } as OrganizationMembership })
}

afterEach(() => useOrganizationStore.setState({ membership: null }))

// The company's clock as `companyWall` hands it over: read from the Date's UTC fields.
const at = (h: number, m: number, s = 0) => new Date(Date.UTC(2026, 9, 1, h, m, s))

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

  it('offers an hour this browser itself skips', () => {
    // 02:10 on the night New York's clocks go forward, for a company that keeps its own.
    companyIn('America/Phoenix')
    expect(defaultTripWindow(new Date(Date.UTC(2026, 2, 8, 2, 10))).pickupTime).toBe('02:30')
  })

  it("moves a pickup off an hour the company's clocks skip, which the form would refuse", () => {
    companyIn('America/New_York')
    // 01:40 rounds up to 02:00, but 02:00 to 03:00 never happens that night in New York.
    expect(defaultTripWindow(new Date(Date.UTC(2026, 2, 8, 1, 40)))).toEqual({
      pickupDate: '2026-03-08',
      pickupTime: '03:00',
      returnDate: '2026-03-09',
      returnTime: '03:00',
    })
  })

  it('moves only the return when the day after is the night the clocks go forward', () => {
    companyIn('America/New_York')
    expect(defaultTripWindow(new Date(Date.UTC(2026, 2, 7, 2, 10)))).toEqual({
      pickupDate: '2026-03-07',
      pickupTime: '02:30',
      returnDate: '2026-03-08',
      returnTime: '03:00',
    })
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
