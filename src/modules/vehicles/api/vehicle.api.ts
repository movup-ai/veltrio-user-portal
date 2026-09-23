import { apiClient } from '@/services/api/client'
import { toPaginatedResult, type ListEnvelope } from '@/lib/pagination'
import type { Vehicle, VehicleInput, VehicleListParams } from '../types/vehicle.types'
import {
  toListQuery,
  toStatsQuery,
  toVehicle,
  toVehiclePayload,
  toVehicleStats,
  type VehicleStatsWire,
  type VehicleWire,
} from './vehicle.mapper'

/**
 * The FastAPI /vehicles endpoints. Wire shapes differ from the portal's domain types in
 * several ways, all handled in vehicle.mapper.ts — nothing above this file sees the API's format.
 */
/** The most `GET /vehicles` allows in one call; asking for more is a 422. */
const FLEET_PAGE_SIZE = 100

/** 10,000 vehicles — far past any real fleet, and a stop if `total` were ever wrong. */
const MAX_FLEET_PAGES = 100

export const vehicleApi = {
  list: (params: VehicleListParams) => {
    // The endpoint pages with limit/offset and returns a flat total, so translate both ways
    // here — callers (and the UI) keep working in page/pageSize.
    const { page, pageSize } = params
    return apiClient
      .get<ListEnvelope<VehicleWire>>('/vehicles', { params: toListQuery(params) })
      .then((r) => toPaginatedResult(r.data.items.map(toVehicle), r.data.total, { page, pageSize }))
  },

  /**
   * The whole fleet, paged through. For the lookups that must cover every vehicle — the make
   * filter and the booking list's cover photos — where stopping at the first 100 silently
   * omits cars. Capped so a wrong `total` cannot spin forever.
   */
  listAll: async (): Promise<Vehicle[]> => {
    const vehicles: Vehicle[] = []
    for (let page = 1; page <= MAX_FLEET_PAGES; page++) {
      const result = await vehicleApi.list({ page, pageSize: FLEET_PAGE_SIZE })
      vehicles.push(...result.items)
      if (vehicles.length >= result.total) break
    }
    return vehicles
  },

  /**
   * Fleet totals for the same filters as `list`. A dedicated endpoint because the list caps
   * `limit` at 100 — summarizing by fetching every vehicle stops working on the 101st.
   */
  stats: (params: VehicleListParams) =>
    apiClient
      .get<VehicleStatsWire>('/vehicles/stats', { params: toStatsQuery(params) })
      .then((r) => toVehicleStats(r.data)),

  get: (id: string) => apiClient.get<VehicleWire>(`/vehicles/${id}`).then((r) => toVehicle(r.data)),

  create: (input: VehicleInput) =>
    apiClient.post<VehicleWire>('/vehicles', toVehiclePayload(input)).then((r) => toVehicle(r.data)),

  update: (id: string, input: VehicleInput) =>
    apiClient
      .patch<VehicleWire>(`/vehicles/${id}`, toVehiclePayload(input))
      .then((r) => toVehicle(r.data)),

  /** Retires a vehicle without destroying it; photos and history are kept. */
  archive: (id: string) =>
    apiClient.post<VehicleWire>(`/vehicles/${id}/archive`).then((r) => toVehicle(r.data)),

  restore: (id: string) =>
    apiClient.post<VehicleWire>(`/vehicles/${id}/restore`).then((r) => toVehicle(r.data)),

  /** Moves a vehicle into maintenance. Refused by the API while it is on rent. */
  sendToService: (id: string) =>
    apiClient.post<VehicleWire>(`/vehicles/${id}/service`).then((r) => toVehicle(r.data)),

  returnFromService: (id: string) =>
    apiClient.delete<VehicleWire>(`/vehicles/${id}/service`).then((r) => toVehicle(r.data)),

  remove: (id: string) => apiClient.delete<void>(`/vehicles/${id}`).then((r) => r.data),

  /**
   * Sets the tenant's fleet order. Must list every vehicle exactly once — the API rejects a
   * partial list, since reordering a filtered page would renumber vehicles nobody saw.
   */
  reorder: (vehicleIds: string[]) =>
    apiClient
      .put<VehicleWire[]>('/vehicles/order', { vehicleIds })
      .then((r) => r.data.map(toVehicle)),
}
