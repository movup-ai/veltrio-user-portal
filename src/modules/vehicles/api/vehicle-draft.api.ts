import { apiClient } from '@/services/api/client'
import { toLimitOffset, toPaginatedResult, type ListEnvelope } from '@/lib/pagination'
import type { PaginationParams } from '@/types/common'
import type { VehicleDraft, VehicleDraftPayload } from '../types/vehicle-draft.types'
import type { VehicleInput } from '../types/vehicle.types'
import { toVehicle, toVehiclePayload, type VehicleWire } from './vehicle.mapper'

/**
 * Part-filled wizards, saved by "Save draft & exit". Kept apart from /vehicles because a draft
 * has none of what makes a vehicle valid — no VIN, plate or specs — so it is stored as the
 * portal's own form state and only becomes a Vehicle when it is published.
 */
export const vehicleDraftApi = {
  list: (params: PaginationParams) =>
    apiClient
      .get<ListEnvelope<VehicleDraft>>('/vehicles/drafts', { params: toLimitOffset(params) })
      .then((r) => toPaginatedResult(r.data.items, r.data.total, params)),

  create: (payload: VehicleDraftPayload) =>
    apiClient.post<VehicleDraft>('/vehicles/drafts', { payload }).then((r) => r.data),

  update: (id: string, payload: VehicleDraftPayload) =>
    apiClient.patch<VehicleDraft>(`/vehicles/drafts/${id}`, { payload }).then((r) => r.data),

  remove: (id: string) => apiClient.delete<void>(`/vehicles/drafts/${id}`).then((r) => r.data),

  publish: (id: string, input: VehicleInput) =>
    apiClient
      .post<VehicleWire>(`/vehicles/drafts/${id}/publish`, toVehiclePayload(input))
      .then((r) => toVehicle(r.data)),
}
