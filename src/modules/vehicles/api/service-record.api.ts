import { apiClient } from '@/services/api/client'
import type {
  ServiceDue,
  ServiceDueState,
  ServiceHistory,
  ServiceRecord,
  ServiceRecordInput,
  ServiceType,
} from '../types/service-record.types'

interface ServiceRecordWire {
  id: string
  vehicleId: string
  serviceType: string
  performedOn: string
  odometer: number | null
  costCents: number | null
  vendor: string | null
  notes: string | null
  nextDueOn: string | null
  nextDueOdometer: number | null
}

interface ServiceDueWire {
  recordId: string
  serviceType: string
  state: ServiceDueState
  nextDueOn: string | null
  nextDueOdometer: number | null
  daysRemaining: number | null
  milesRemaining: number | null
}

interface ServiceHistoryWire {
  items: ServiceRecordWire[]
  summary: {
    recordCount: number
    totalCostCents: number
    lastServiceOn: string | null
  }
  due: ServiceDueWire | null
}

const TYPE_TO_API = {
  'Oil change': 'oil_change',
  'Tire replacement': 'tire_replacement',
  'Brake service': 'brake_service',
  Inspection: 'inspection',
  Repair: 'repair',
  Cleaning: 'cleaning',
  Other: 'other',
} as const satisfies Record<ServiceType, string>

const TYPE_FROM_API = Object.fromEntries(
  Object.entries(TYPE_TO_API).map(([portal, slug]) => [slug, portal]),
) as Record<string, ServiceType>

function toRecord(wire: ServiceRecordWire): ServiceRecord {
  return {
    id: wire.id,
    vehicleId: wire.vehicleId,
    serviceType: TYPE_FROM_API[wire.serviceType] ?? 'Other',
    performedOn: wire.performedOn,
    odometer: wire.odometer ?? undefined,
    cost: wire.costCents == null ? undefined : wire.costCents / 100,
    vendor: wire.vendor ?? undefined,
    notes: wire.notes ?? undefined,
    nextDueOn: wire.nextDueOn ?? undefined,
    nextDueOdometer: wire.nextDueOdometer ?? undefined,
  }
}

function toDue(wire: ServiceDueWire): ServiceDue {
  return {
    recordId: wire.recordId,
    serviceType: TYPE_FROM_API[wire.serviceType] ?? 'Other',
    state: wire.state,
    nextDueOn: wire.nextDueOn ?? undefined,
    nextDueOdometer: wire.nextDueOdometer ?? undefined,
    daysRemaining: wire.daysRemaining ?? undefined,
    milesRemaining: wire.milesRemaining ?? undefined,
  }
}

function toWire(input: ServiceRecordInput) {
  return {
    serviceType: TYPE_TO_API[input.serviceType],
    performedOn: input.performedOn,
    odometer: input.odometer ?? null,
    costCents: input.cost == null ? null : Math.round(input.cost * 100),
    vendor: input.vendor?.trim() || null,
    notes: input.notes?.trim() || null,
    nextDueOn: input.nextDueOn || null,
    nextDueOdometer: input.nextDueOdometer ?? null,
  }
}

const recordsUrl = (vehicleId: string) => `/vehicles/${vehicleId}/service-records`

export const serviceRecordApi = {
  list: (vehicleId: string): Promise<ServiceHistory> =>
    apiClient.get<ServiceHistoryWire>(recordsUrl(vehicleId)).then((r) => ({
      items: r.data.items.map(toRecord),
      summary: {
        recordCount: r.data.summary.recordCount,
        totalCost: r.data.summary.totalCostCents / 100,
        lastServiceOn: r.data.summary.lastServiceOn ?? undefined,
      },
      due: r.data.due ? toDue(r.data.due) : undefined,
    })),

  create: (vehicleId: string, input: ServiceRecordInput): Promise<ServiceRecord> =>
    apiClient
      .post<ServiceRecordWire>(recordsUrl(vehicleId), toWire(input))
      .then((r) => toRecord(r.data)),

  update: (vehicleId: string, recordId: string, input: ServiceRecordInput): Promise<ServiceRecord> =>
    apiClient
      .put<ServiceRecordWire>(`${recordsUrl(vehicleId)}/${recordId}`, toWire(input))
      .then((r) => toRecord(r.data)),

  remove: (vehicleId: string, recordId: string): Promise<void> =>
    apiClient.delete(`${recordsUrl(vehicleId)}/${recordId}`).then(() => undefined),
}
