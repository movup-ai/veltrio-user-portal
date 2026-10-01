import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/services/api/client'
import { bookingApi, ExportTooLargeError } from './booking.api'
import type { BookingWire } from './booking.mapper'
import type { BookingFilters } from '../types/booking.types'

const NO_FILTERS: BookingFilters = {
  search: '',
  status: 'Any',
  location: 'All',
  pickup: { from: '', to: '' },
  make: 'All',
  durationBand: 'Any',
  valueBands: [],
}

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
    rate: {
      optionId: 'r1',
      label: 'Daily',
      basis: 'day',
      rateCents: 5500,
      units: 1,
      includedMiles: 200,
      lines: [{ optionId: 'r1', label: 'Daily', basis: 'day', rateCents: 5500, count: 1, cappedHours: null }],
    },
    pickupLocation: 'Downtown',
    returnLocation: 'Downtown',
    pickupAt: '2099-10-01T13:30:00Z',
    returnAt: '2099-10-02T13:30:00Z',
    additionalDrivers: [],
    fees: [],
    verifications: [],
    pricing: {
      rentalSubtotalCents: 5500,
      discount: null,
      driversCents: 0,
      feesCents: 0,
      subtotalCents: 5500,
      taxRatePct: '0.00',
      taxCents: 0,
      totalCents: 5500,
      depositCents: 0,
    },
    payment: { state: 'unpaid', paidCents: 0, refundedCents: 0, method: null, paidAt: null },
    contract: { signedAt: null, version: null },
    verification: null,
    pickedUpAt: null,
    returnedAt: null,
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

describe('bookingApi.exportAll', () => {
  const params = { filters: NO_FILTERS, tab: 'Upcoming' as const, sort: 'newest' as const }

  it('gathers every matching row, not just the first page', async () => {
    get.mockResolvedValueOnce(page(0, 250))
    get.mockResolvedValueOnce(page(100, 250))
    get.mockResolvedValueOnce(page(200, 250))

    expect(await bookingApi.exportAll(params)).toHaveLength(250)
  })

  it('refuses rather than returning a short CSV past the cap', async () => {
    // Silently truncating is the failure this guards: nothing on screen would say the export
    // was missing records.
    get.mockResolvedValue(page(0, 20_000))

    await expect(bookingApi.exportAll(params)).rejects.toThrow(ExportTooLargeError)
  })

  it('refuses on the first response rather than fetching every page first', async () => {
    // The first page already reports the total, so an export that cannot finish should cost
    // one request — not 50 sequential ones and 5,000 mapped rows before the same refusal.
    get.mockResolvedValue(page(0, 20_000))

    await expect(bookingApi.exportAll(params)).rejects.toThrow(ExportTooLargeError)
    expect(get).toHaveBeenCalledOnce()
  })

  it('reports the real total so the message can say how far over it is', async () => {
    get.mockResolvedValue(page(0, 20_000))

    await expect(bookingApi.exportAll(params)).rejects.toMatchObject({
      total: 20_000,
      limit: 5_000,
    })
  })
})
