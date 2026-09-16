const SPARK_UP = '0,22 9,19 18,21 27,14 36,16 45,10 54,11 63,4 72,2'
const SPARK_DOWN = '0,6 9,9 18,7 27,13 36,11 45,16 54,15 63,20 72,22'

/** `labelKey`/`noteKey` index into the `dashboard` namespace — never render them directly. */
export interface KpiDef {
  labelKey: 'revenueMtd' | 'activeRentals' | 'fleetUtilization' | 'bookings7d'
  noteKey: 'vsAug' | 'outToday' | 'vsLastWeek' | 'vsPriorWeek'
  value: string
  delta: string
  up: boolean
  spark: string
}

export const KPIS: KpiDef[] = [
  { labelKey: 'revenueMtd', value: '$284,610', delta: '12.4%', noteKey: 'vsAug', up: true, spark: SPARK_UP },
  { labelKey: 'activeRentals', value: '105', delta: '8', noteKey: 'outToday', up: true, spark: SPARK_UP },
  { labelKey: 'fleetUtilization', value: '74%', delta: '3.1%', noteKey: 'vsLastWeek', up: true, spark: SPARK_UP },
  { labelKey: 'bookings7d', value: '63', delta: '4.2%', noteKey: 'vsPriorWeek', up: false, spark: SPARK_DOWN },
]

export type OpKey = 'pickupsToday' | 'returnsToday' | 'overdueReturns' | 'unpaidInvoices'

export interface OpDef {
  key: OpKey
  count: string
  target: 'Bookings' | 'Payments'
}

export const OPS: OpDef[] = [
  { key: 'pickupsToday', count: '6', target: 'Bookings' },
  { key: 'returnsToday', count: '4', target: 'Bookings' },
  { key: 'overdueReturns', count: '1', target: 'Bookings' },
  { key: 'unpaidInvoices', count: '2', target: 'Payments' },
]

/** Daily gross revenue, last 14 days (thousands of USD). */
export const REVENUE_14D = [3.1, 4.4, 5.2, 4.0, 2.6, 3.4, 6.1, 5.4, 4.7, 5.9, 7.2, 6.6, 5.1, 7.8]

export const FLEET_DONUT_GRADIENT =
  'conic-gradient(var(--color-primary) 0 74%, var(--color-warning) 74% 82%, var(--color-border-strong) 82% 88%, var(--color-surface-3) 88% 100%)'

/** `status` is a canonical value from the shared `domain:status` vocabulary. */
export interface FleetStatusDef {
  status: string
  count: string
  color: string
}

export const FLEET_STATUS: FleetStatusDef[] = [
  { status: 'On rent', count: '105', color: 'var(--color-primary)' },
  { status: 'Available', count: '17', color: 'var(--color-surface-3)' },
  { status: 'Maintenance', count: '12', color: 'var(--color-warning)' },
  { status: 'Out of service', count: '8', color: 'var(--color-border-strong)' },
]
