import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/services/api/client'
import { vehicleApi } from './vehicle.api'

vi.mock('@/services/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

const get = vi.mocked(apiClient.get)

/** Only the fields `listAll` and its callers touch; the mapper is covered elsewhere. */
function wire(id: string) {
  return {
    id,
    make: 'Honda',
    model: 'Accord',
    year: 2024,
    vehicleType: 'sedan',
    color: 'White',
    plate: `FL-${id}`,
    vin: `VIN${id}`,
    uri: { slug: id, canonicalUrl: '' },
    location: 'Main Office',
    status: 'available',
    mileage: 0,
    description: null,
    rateOptions: [],
    fees: {},
    specs: {},
    photos: [],
    position: 0,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  }
}

/** `count` vehicles served as pages of 100, the way the API does. */
function page(offset: number, total: number) {
  const items = Array.from({ length: Math.min(100, total - offset) }, (_, i) =>
    wire(`v${offset + i}`),
  )
  return { data: { items, total } }
}

// A block body: a function returned from beforeEach runs as cleanup, which would call `get()`.
beforeEach(() => {
  get.mockReset()
})

describe('vehicleApi.listAll', () => {
  it('pages past the API cap rather than stopping at the first 100', async () => {
    // The bug this pins: a single page left cars 101+ out, so their makes vanished from the
    // filter and their bookings showed no cover photo.
    get.mockResolvedValueOnce(page(0, 250) as never)
    get.mockResolvedValueOnce(page(100, 250) as never)
    get.mockResolvedValueOnce(page(200, 250) as never)

    const fleet = await vehicleApi.listAll()

    expect(fleet).toHaveLength(250)
    expect(get).toHaveBeenCalledTimes(3)
    expect(new Set(fleet.map((v) => v.id)).size).toBe(250)
  })

  it('reads a fleet past the bookings cap of 5,000 in full', async () => {
    get.mockImplementation((_url, config) => {
      const { offset } = config?.params as { offset: number }
      return Promise.resolve(page(offset, 6_000)) as never
    })

    expect(await vehicleApi.listAll()).toHaveLength(6_000)
  })

  it('stops after one call when the fleet fits on a page', async () => {
    get.mockResolvedValueOnce(page(0, 12) as never)

    expect(await vehicleApi.listAll()).toHaveLength(12)
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('stops rather than looping forever when the total is wrong', async () => {
    // A total the pages can never satisfy would otherwise spin until the tab dies.
    get.mockResolvedValue(page(0, 1_000_000) as never)

    await vehicleApi.listAll()

    expect(get.mock.calls.length).toBeLessThanOrEqual(100)
  })
})
