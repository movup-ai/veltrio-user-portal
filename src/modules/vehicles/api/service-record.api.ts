import { apiClient } from '@/services/api/client'
import type { ServiceHistory, ServiceRecord, ServiceRecordInput } from '../types/service-record.types'
import {
  toServiceHistory,
  toServiceRecord,
  toServiceRecordPayload,
  type ServiceHistoryWire,
  type ServiceRecordWire,
} from './vehicle.mapper'

const recordsUrl = (vehicleId: string) => `/vehicles/${vehicleId}/service-records`

export const serviceRecordApi = {
  list: (vehicleId: string): Promise<ServiceHistory> =>
    apiClient.get<ServiceHistoryWire>(recordsUrl(vehicleId)).then((r) => toServiceHistory(r.data)),

  create: (vehicleId: string, input: ServiceRecordInput): Promise<ServiceRecord> =>
    apiClient
      .post<ServiceRecordWire>(recordsUrl(vehicleId), toServiceRecordPayload(input))
      .then((r) => toServiceRecord(r.data)),

  update: (vehicleId: string, recordId: string, input: ServiceRecordInput): Promise<ServiceRecord> =>
    apiClient
      .put<ServiceRecordWire>(`${recordsUrl(vehicleId)}/${recordId}`, toServiceRecordPayload(input))
      .then((r) => toServiceRecord(r.data)),

  remove: (vehicleId: string, recordId: string): Promise<void> =>
    apiClient.delete(`${recordsUrl(vehicleId)}/${recordId}`).then(() => undefined),
}
