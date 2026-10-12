import { afterEach, describe, expect, it } from 'vitest'
import { combineDateTime } from '@/modules/bookings/schema/booking.schema'
import { durationHours } from '@/modules/bookings/utils/booking.pricing'
import { formatRentalWindow } from '@/modules/bookings/utils/booking.utils'
import { formatMomentIn } from '@/i18n/formatters'
import { useOrganizationStore } from '@/state/organization.store'
import type { OrganizationMembership } from '@/types/user'
import { awayFromCompanyTime, companyWall, wallClockHours, zoneName, zonedInstant } from './company-time'

const NEW_YORK = 'America/New_York'
const HONOLULU = 'Pacific/Honolulu'

function companyIn(timezone: string) {
  useOrganizationStore.setState({ membership: { timezone } as OrganizationMembership })
}

afterEach(() => useOrganizationStore.setState({ membership: null }))

describe('zonedInstant', () => {
  it("reads a date and time on the zone's clock, in summer and in winter", () => {
    expect(zonedInstant('2026-10-10', '10:00', NEW_YORK).toISOString()).toBe('2026-10-10T14:00:00.000Z')
    expect(zonedInstant('2026-11-09', '10:00', NEW_YORK).toISOString()).toBe('2026-11-09T15:00:00.000Z')
    expect(zonedInstant('2026-10-10', '10:00', HONOLULU).toISOString()).toBe('2026-10-10T20:00:00.000Z')
  })

  it('takes the first of an hour the clocks repeat', () => {
    expect(zonedInstant('2026-11-01', '01:30', NEW_YORK).toISOString()).toBe('2026-11-01T05:30:00.000Z')
  })

  it('is invalid while the date is missing', () => {
    expect(Number.isNaN(zonedInstant('', '10:00', NEW_YORK).getTime())).toBe(true)
  })
})

describe('companyWall', () => {
  it("gives a Date whose own fields read the zone's clock", () => {
    const wall = companyWall('2026-10-10T14:30:00Z', NEW_YORK)
    expect([wall.getFullYear(), wall.getMonth(), wall.getDate(), wall.getHours(), wall.getMinutes()]).toEqual(
      [2026, 9, 10, 10, 30],
    )
    // Late evening in New York is still the day before in Honolulu.
    expect(companyWall('2026-10-11T03:00:00Z', HONOLULU).getDate()).toBe(10)
  })
})

describe('wallClockHours', () => {
  it('counts two days as 48 hours across either clock change', () => {
    // 49 hours pass on the night the clocks go back, 47 on the night they go forward.
    expect(wallClockHours('2026-10-31T14:00:00Z', '2026-11-02T15:00:00Z', NEW_YORK)).toBe(48)
    expect(wallClockHours('2026-03-07T15:00:00Z', '2026-03-09T14:00:00Z', NEW_YORK)).toBe(48)
  })
})

describe('zoneName', () => {
  it('follows the clocks through the year', () => {
    expect(zoneName('2026-07-01T12:00:00Z', NEW_YORK)).toBe('EDT')
    expect(zoneName('2026-12-01T12:00:00Z', NEW_YORK)).toBe('EST')
  })
})

describe('awayFromCompanyTime', () => {
  it('is false on the same clock and true on another', () => {
    const here = Intl.DateTimeFormat().resolvedOptions().timeZone
    expect(awayFromCompanyTime(Date.now(), here)).toBe(false)
    // No zone is on both of these clocks at once.
    const now = Date.parse('2026-10-10T12:00:00Z')
    expect(awayFromCompanyTime(now, NEW_YORK) && awayFromCompanyTime(now, HONOLULU)).toBe(false)
    expect(awayFromCompanyTime(now, NEW_YORK) || awayFromCompanyTime(now, HONOLULU)).toBe(true)
  })
})

describe("booking times on the company's clock", () => {
  it('enters a pickup as the hour at the company, whatever this machine is set to', () => {
    companyIn(NEW_YORK)
    expect(combineDateTime('2026-10-10', '10:00').toISOString()).toBe('2026-10-10T14:00:00.000Z')
    companyIn(HONOLULU)
    expect(combineDateTime('2026-10-10', '10:00').toISOString()).toBe('2026-10-10T20:00:00.000Z')
  })

  it("shows an instant from the API as the company's hour", () => {
    companyIn(NEW_YORK)
    const clock = { hour: 'numeric', minute: '2-digit', hour12: true } as const
    expect(formatMomentIn('en', '2026-10-10T14:00:00Z', clock)).toBe('10:00 AM')
    expect(formatMomentIn('en', '2026-10-10T14:00:00+00:00', clock)).toBe('10:00 AM')
    companyIn(HONOLULU)
    expect(formatMomentIn('en', '2026-10-10T14:00:00Z', clock)).toBe('4:00 AM')
    expect(formatRentalWindow('2026-10-10T20:00:00Z', '2026-10-12T20:00:00Z')).toBe(
      'Oct 10 · 10:00 → Oct 12 · 10:00',
    )
  })

  it('leaves a picked day or time as it was picked', () => {
    companyIn(HONOLULU)
    expect(formatMomentIn('en', '2026-03-12T00:00:00', { month: 'short', day: 'numeric' })).toBe('Mar 12')
    expect(formatMomentIn('en', new Date(2026, 2, 12, 9, 30), { hour: 'numeric', minute: '2-digit' })).toBe(
      '9:30 AM',
    )
  })

  it('prices two days across the clock change as two days, as the API does', () => {
    companyIn(NEW_YORK)
    const pickup = combineDateTime('2026-10-31', '10:00').toISOString()
    const back = combineDateTime('2026-11-02', '10:00').toISOString()
    expect((Date.parse(back) - Date.parse(pickup)) / 3_600_000).toBe(49)
    expect(durationHours(pickup, back)).toBe(48)
  })
})
