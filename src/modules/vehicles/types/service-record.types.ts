export const SERVICE_TYPES = [
  'Oil change',
  'Tire replacement',
  'Brake service',
  'Inspection',
  'Repair',
  'Cleaning',
  'Other',
] as const
export type ServiceType = (typeof SERVICE_TYPES)[number]

export interface ServiceRecord {
  id: string
  vehicleId: string
  serviceType: ServiceType
  /** `YYYY-MM-DD`. A calendar day, deliberately not a timestamp — the work happened on a date. */
  performedOn: string
  odometer?: number
  /** Dollars, like every other money value in the portal. */
  cost?: number
  vendor?: string
  notes?: string
  /** When this work is next due. Either may be set, or neither. */
  nextDueOn?: string
  nextDueOdometer?: number
}

export type ServiceRecordInput = Omit<ServiceRecord, 'id' | 'vehicleId'>

export const SERVICE_DUE_STATES = ['overdue', 'due_soon', 'scheduled'] as const
export type ServiceDueState = (typeof SERVICE_DUE_STATES)[number]

/** The soonest outstanding service, resolved by the API against the vehicle's odometer. */
export interface ServiceDue {
  recordId: string
  serviceType: ServiceType
  state: ServiceDueState
  nextDueOn?: string
  nextDueOdometer?: number
  /** Negative once passed, so "overdue by" needs no re-derivation. */
  daysRemaining?: number
  milesRemaining?: number
}

export interface ServiceSummary {
  recordCount: number
  totalCost: number
  lastServiceOn?: string
}

export interface ServiceHistory {
  items: ServiceRecord[]
  summary: ServiceSummary
  due?: ServiceDue
}
