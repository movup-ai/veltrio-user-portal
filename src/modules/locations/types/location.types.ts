export interface LocationMetric {
  value: string
  label: string
}

export interface Location {
  name: string
  address: string
  status: string
  hours: string
  manager: string
  metrics: LocationMetric[]
}
