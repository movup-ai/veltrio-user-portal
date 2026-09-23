import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/services/api/client'
import { bookingApi } from './booking.api'
import type { BookingWire } from './booking.mapper'

vi.mock('@/services/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

vi.mock('@/modules/vehicles/api/vehicle.api', () => ({ vehicleApi: { get: vi.fn() } }))
vi.mock('@/modules/locations/api/location.api', () => ({ locationApi: { list: vi.fn() } }))

const get = vi.mocked(apiClient.get)

function wire(reference: string): BookingWire {
  return {
    id: reference,
    reference,
    status: 'confirmed',
    customer: {
      id: 'c1',
      name: 'Marisol Vega',
      email: 'marisol@example.com',
      phone: '+1 305 442 0118',
      dateOfBirth: null,
      address: null,
      licenceNumber: 'FL D-1',
      licenceExpiry: null,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    vehicleId: 'v1',
    vehicleName: 'Toyota Camry',
    vehiclePlate: 'ABC1234',
    rate: { optionId: 'r1', label: 'Daily', basis: 'day', rateCents: 5500, units: 1, includedMiles: 200 },
    pickupLocation: 'Downtown',
    returnLocation: 'Downtown',
    pickupAt: '2099-10-01T13:30:00Z',
    returnAt: '2099-10-02T13:30:00Z',
    additionalDrivers: [],
    fees: [],
    verifications: [],
    pricing: {
      rentalSubtotalCents: 5500,
      driversCents: 0,
      feesCents: 0,
      subtotalCents: 5500,
      taxRatePct: '0.00',
      taxCents: 0,
      totalCents: 5500,
      depositCents: 0,
    },
    createdAt: '2026-09-22T10:00:00Z',
    updatedAt: '2026-09-22T10:00:00Z',
  }
}

/** `count` bookings served as pages of 100, the way the API does. */
function page(offset: number, total: number) {
  const items = Array.from({ length: Math.min(100, total - offset) }, (_, i) => wire(`BK-${offset + i}`))
  return { data: { items, total } }
}

describe('bookingApi.list', () => {
  beforeEach(() => get.mockReset())

  it('fetches every page, so bookings past the first 100 are not silently dropped', async () => {
    // 250 bookings is three pages. Reading only the first would lose 150 of them from the
    // table, the stats, the filters and the CSV — with nothing on screen saying so.
    get.mockImplementation((_url, config) => {
      const offset = (config?.params as { offset?: number } | undefined)?.offset ?? 0
      return Promise.resolve(page(offset, 250))
    })

    const lists = await bookingApi.list()

    expect(get).toHaveBeenCalledTimes(3)
    expect(lists.upcoming).toHaveLength(250)
    expect(get.mock.calls.map((c) => (c[1]?.params as { offset: number }).offset)).toEqual([0, 100, 200])
  })

  it('makes a single call when everything fits on one page', async () => {
    get.mockResolvedValue(page(0, 40))

    const lists = await bookingApi.list()

    expect(get).toHaveBeenCalledOnce()
    expect(lists.upcoming).toHaveLength(40)
  })

  it('handles an empty book of business', async () => {
    get.mockResolvedValue({ data: { items: [], total: 0 } })

    const lists = await bookingApi.list()

    expect(get).toHaveBeenCalledOnce()
    expect(lists.upcoming).toEqual([])
  })
})
