import { afterEach, describe, expect, it } from 'vitest'
import { useOrganizationStore } from '@/state/organization.store'
import type { OrganizationMembership } from '@/types/user'
import type { Vehicle } from '../types/vehicle.types'
import { availabilityForVehicle } from './availability'

const CAR = { status: 'Available' } as Vehicle

function companyIn(timezone: string) {
  useOrganizationStore.setState({ membership: { timezone } as OrganizationMembership })
}

/** The day a cell stands for, read the way the strip reads it: from the Date's UTC fields. */
const day = (date: Date) => date.toISOString().slice(0, 10)

afterEach(() => useOrganizationStore.setState({ membership: null }))

describe('availabilityForVehicle', () => {
  it("marks the company's day a rental falls on, not the one it spills into elsewhere", () => {
    companyIn('Pacific/Honolulu')
    // 17:00 to 19:00 on 10 October in Honolulu, which is already the 11th in New York and in UTC.
    const busy = [{ from: '2026-10-11T03:00:00Z', to: '2026-10-11T05:00:00Z' }]

    // 10:00 on the 10th in Honolulu.
    const days = availabilityForVehicle(CAR, busy, new Date('2026-10-10T20:00:00Z'))

    expect(days.slice(0, 3).map((cell) => cell.state)).toEqual(['booked', 'available', 'available'])
  })

  it("starts on the company's today", () => {
    companyIn('Pacific/Honolulu')

    // 08:00 UTC on the 11th is still the evening of the 10th in Honolulu, and the 11th in New York.
    const [first] = availabilityForVehicle(CAR, [], new Date('2026-10-11T08:00:00Z'))

    expect([day(first.date), first.isToday]).toEqual(['2026-10-10', true])
  })

  it('steps a whole day at a time across a night this browser changes its clocks', () => {
    companyIn('Pacific/Honolulu')

    // The fortnight from 28 October crosses 1 November, when New York's clocks go back.
    const days = availabilityForVehicle(CAR, [], new Date('2026-10-28T20:00:00Z'))

    expect(days.map((cell) => day(cell.date)).slice(3, 7)).toEqual([
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
    ])
    expect(days.every((cell) => cell.date.getUTCHours() === 0)).toBe(true)
  })
})
