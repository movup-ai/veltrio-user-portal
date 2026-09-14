const SPARK_UP = '0,22 9,19 18,21 27,14 36,16 45,10 54,11 63,4 72,2'
const SPARK_DOWN = '0,6 9,9 18,7 27,13 36,11 45,16 54,15 63,20 72,22'

export interface KpiDef {
  label: string
  value: string
  delta: string
  deltaNote: string
  up: boolean
  spark: string
}

export const KPIS: KpiDef[] = [
  { label: 'Revenue (MTD)', value: '$284,610', delta: '12.4%', deltaNote: 'vs. Aug', up: true, spark: SPARK_UP },
  { label: 'Active rentals', value: '105', delta: '8', deltaNote: 'out today', up: true, spark: SPARK_UP },
  { label: 'Fleet utilization', value: '74%', delta: '3.1%', deltaNote: 'vs. last wk', up: true, spark: SPARK_UP },
  { label: 'Bookings (7d)', value: '63', delta: '4.2%', deltaNote: 'vs. prior wk', up: false, spark: SPARK_DOWN },
]

export interface OpDef {
  label: string
  count: string
  target: 'Bookings' | 'Payments'
}

export const OPS: OpDef[] = [
  { label: 'Pickups today', count: '6', target: 'Bookings' },
  { label: 'Returns today', count: '4', target: 'Bookings' },
  { label: 'Overdue returns', count: '1', target: 'Bookings' },
  { label: 'Unpaid invoices', count: '2', target: 'Payments' },
]

/** Daily gross revenue, last 14 days (thousands of USD). */
export const REVENUE_14D = [3.1, 4.4, 5.2, 4.0, 2.6, 3.4, 6.1, 5.4, 4.7, 5.9, 7.2, 6.6, 5.1, 7.8]

export const FLEET_DONUT_GRADIENT =
  'conic-gradient(var(--color-primary) 0 74%, var(--color-warning) 74% 82%, var(--color-border-strong) 82% 88%, var(--color-surface-3) 88% 100%)'

export interface FleetStatusDef {
  label: string
  count: string
  color: string
}

export const FLEET_STATUS: FleetStatusDef[] = [
  { label: 'On rent', count: '105', color: 'var(--color-primary)' },
  { label: 'Available', count: '17', color: 'var(--color-surface-3)' },
  { label: 'Maintenance', count: '12', color: 'var(--color-warning)' },
  { label: 'Out of service', count: '8', color: 'var(--color-border-strong)' },
]
