export type LocationMetricKey = 'vehicles' | 'utilization' | 'revenueMtd'

export interface LocationMetric {
  value: string
  /** Indexes into `locations:card.metrics` — not display text. */
  key: LocationMetricKey
}

export interface Location {
  name: string
  address: string
  /** Canonical value from the shared `domain:status` vocabulary. */
  status: string
  /** Days key from `locations:hours` plus the literal clock range, which needs no translation. */
  hours: { daysKey: 'monSun' | 'monFri'; range: string }
  /** Manager's name; the role is appended from `locations:card.branchManager`. */
  manager: string
  metrics: LocationMetric[]
}
