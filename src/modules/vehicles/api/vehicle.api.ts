import { apiClient } from '@/services/api/client'
import i18n from '@/i18n'
import { mockDelay, useMocks } from '@/lib/mock'
import { ApiError } from '@/types/api'
import { toLimitOffset, toPaginatedResult, type ListEnvelope } from '@/lib/pagination'
import type { PaginatedResult } from '@/types/common'
import { VEHICLES_SEED } from '../mock/vehicle.mock'
import { VEHICLE_PRICE_BANDS, type Vehicle, type VehicleInput, type VehicleListParams } from '../types/vehicle.types'
import { dailyRateOption } from '../utils/vehicle.utils'

/** In-memory mutable copy of the seed so create/update/delete persist for the session. */
let db: Vehicle[] = VEHICLES_SEED.map((v) => ({ ...v }))

function nextId(): string {
  return `veh_${Math.random().toString(36).slice(2, 10)}`
}

function mockList(params: VehicleListParams): PaginatedResult<Vehicle> {
  let items = db

  if (params.search) {
    const q = params.search.trim().toLowerCase()
    items = items.filter((v) =>
      [v.make, v.model, v.plate, v.vin].some((field) => field?.toLowerCase().includes(q)),
    )
  }
  if (params.status && params.status !== 'Any') items = items.filter((v) => v.status === params.status)
  if (params.location && params.location !== 'All') items = items.filter((v) => v.location === params.location)
  if (params.vehicleType && params.vehicleType !== 'All') items = items.filter((v) => v.vehicleType === params.vehicleType)
  if (params.transmission && params.transmission !== 'Any') items = items.filter((v) => v.specs.transmission === params.transmission)
  if (params.fuelType && params.fuelType !== 'Any') items = items.filter((v) => v.specs.fuelType === params.fuelType)
  if (params.isDraft !== undefined) items = items.filter((v) => Boolean(v.isDraft) === params.isDraft)
  if (params.priceBands && params.priceBands.length > 0) {
    const bands = VEHICLE_PRICE_BANDS.filter((b) => params.priceBands!.includes(b.value))
    items = items.filter((v) => {
      const rate = dailyRateOption(v)?.rate
      if (rate == null) return false
      return bands.some((b) => rate >= b.min && rate < b.max)
    })
  }

  if (params.sortBy === 'utilization') items = [...items].sort((a, b) => b.utilization - a.utilization)
  else if (params.sortBy === 'dailyRate') items = [...items].sort((a, b) => (dailyRateOption(b)?.rate ?? 0) - (dailyRateOption(a)?.rate ?? 0))
  else if (params.sortBy === 'name') items = [...items].sort((a, b) => `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`))

  const total = items.length
  const pageSize = params.pageSize

  const page = Math.min(params.page, Math.max(1, Math.ceil(total / pageSize)))
  const { limit, offset } = toLimitOffset({ page, pageSize })

  return toPaginatedResult(items.slice(offset, offset + limit), total, { page, pageSize })
}

function mockGet(id: string): Vehicle {
  const found = db.find((v) => v.id === id)
  if (!found) throw new ApiError('not_found', i18n.t('vehicles:errors.notFound'), { status: 404 })
  return found
}

/**
 * Thin wrapper around the not-yet-finalized FastAPI vehicles endpoints.
 * Mock-backed CRUD operates on an in-memory copy of the seed data (gated by
 * VITE_USE_MOCKS, see .env.example) so the module is fully explorable before
 * the backend exists — swap this out once /vehicles is live.
 */
export const vehicleApi = {
  list: (params: VehicleListParams) => {
    if (useMocks) return mockDelay(mockList(params))
    // The endpoint pages with limit/offset and returns a flat total, so translate both ways here —
    // callers (and the UI) keep working in page/pageSize.
    const { page, pageSize, ...filters } = params
    return apiClient
      .get<ListEnvelope<Vehicle>>('/vehicles', { params: { ...filters, ...toLimitOffset({ page, pageSize }) } })
      .then((r) => toPaginatedResult(r.data.items, r.data.total, { page, pageSize }))
  },

  get: (id: string) => {
    if (useMocks) return mockDelay(mockGet(id))
    return apiClient.get<Vehicle>(`/vehicles/${id}`).then((r) => r.data)
  },

  create: (input: VehicleInput) => {
    if (useMocks) {
      const created: Vehicle = { ...input, id: nextId(), utilization: 0, createdAt: new Date().toISOString() }
      db = [created, ...db]
      return mockDelay(created)
    }
    return apiClient.post<Vehicle>('/vehicles', input).then((r) => r.data)
  },

  update: (id: string, input: VehicleInput) => {
    if (useMocks) {
      const existing = mockGet(id)
      const updated: Vehicle = { ...existing, ...input, id }
      db = db.map((v) => (v.id === id ? updated : v))
      return mockDelay(updated)
    }
    return apiClient.patch<Vehicle>(`/vehicles/${id}`, input).then((r) => r.data)
  },

  remove: (id: string) => {
    if (useMocks) {
      mockGet(id)
      db = db.filter((v) => v.id !== id)
      return mockDelay(undefined)
    }
    return apiClient.delete<void>(`/vehicles/${id}`).then((r) => r.data)
  },
}
