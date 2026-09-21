import { apiClient } from '@/services/api/client'
import type { Location, LocationInput } from '../types/location.types'
import { toLocation, toLocationPayload, type LocationWire } from './location.mapper'

export const locationApi = {
  list: (): Promise<Location[]> =>
    apiClient.get<LocationWire[]>('/locations').then((r) => r.data.map(toLocation)),

  create: (input: LocationInput): Promise<Location> =>
    apiClient.post<LocationWire>('/locations', toLocationPayload(input)).then((r) => toLocation(r.data)),

  update: (id: string, input: LocationInput): Promise<Location> =>
    apiClient.put<LocationWire>(`/locations/${id}`, toLocationPayload(input)).then((r) => toLocation(r.data)),

  remove: (id: string): Promise<void> =>
    apiClient.delete(`/locations/${id}`).then(() => undefined),
}
