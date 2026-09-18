import { apiClient } from '@/services/api/client'
import { toPaginatedResult, type ListEnvelope } from '@/lib/pagination'
import type { VehicleInput, VehicleListParams } from '../types/vehicle.types'
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

  remove: (id: string) => apiClient.delete<void>(`/vehicles/${id}`).then((r) => r.data),
}
