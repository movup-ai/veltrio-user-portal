import { afterEach, describe, expect, it } from 'vitest'
import { useOrganizationStore } from '@/state/organization.store'
import type { OrganizationMembership } from '@/types/user'
import type { Vehicle } from '../types/vehicle.types'
import { availabilityForVehicle } from './availability'

const CAR = { status: 'Available' } as Vehicle

afterEach(() => useOrganizationStore.setState({ membership: null }))

describe('availabilityForVehicle', () => {
  it("marks the company's day a rental falls on, not the one it spills into elsewhere", () => {
    useOrganizationStore.setState({ membership: { timezone: 'Pacific/Honolulu' } as OrganizationMembership })
    // 17:00 to 19:00 on 10 October in Honolulu, which is already the 11th in New York and in UTC.
    const busy = [{ from: '2026-10-11T03:00:00Z', to: '2026-10-11T05:00:00Z' }]

    const days = availabilityForVehicle(CAR, busy, new Date(2026, 9, 10, 8))

    expect(days.slice(0, 3).map((day) => day.state)).toEqual(['booked', 'available', 'available'])
  })

  it("starts on the company's today", () => {
    useOrganizationStore.setState({ membership: { timezone: 'Pacific/Honolulu' } as OrganizationMembership })

    // 08:00 UTC on the 11th is still the evening of the 10th in Honolulu, and the 11th in New York.
    const [first] = availabilityForVehicle(CAR, [], new Date('2026-10-11T08:00:00Z'))

    expect([first.date.getMonth(), first.date.getDate(), first.isToday]).toEqual([9, 10, true])
  })
})
