import { apiClient } from '@/services/api/client'
import { mockDelay, useMocks } from '@/lib/mock'
import { ApiError } from '@/types/api'
import type { PaginatedResult } from '@/types/common'
import { VEHICLES_SEED } from '../mock/vehicle.mock'
import type { Vehicle, VehicleInput, VehicleListParams } from '../types/vehicle.types'

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
  if (params.class && params.class !== 'All') items = items.filter((v) => v.class === params.class)

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize))
  const page = Math.min(params.page, totalPages)
  const start = (page - 1) * params.pageSize
  const pageItems = items.slice(start, start + params.pageSize)

  return { items: pageItems, page, pageSize: params.pageSize, total, totalPages }
}

function mockGet(id: string): Vehicle {
  const found = db.find((v) => v.id === id)
  if (!found) throw new ApiError('not_found', 'Vehicle not found', { status: 404 })
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
    return apiClient
      .get<PaginatedResult<Vehicle>>('/vehicles', { params })
      .then((r) => r.data)
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
