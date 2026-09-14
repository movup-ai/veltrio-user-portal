import type { Row } from '@/components/data-display/record-table.types'
import type { VehicleTuple } from '../types/vehicle.types'

export function vehicleColumns() {
  return [
    { label: 'Vehicle', align: 'left' as const },
    { label: 'Plate / VIN', align: 'left' as const },
    { label: 'Location', align: 'left' as const },
    { label: 'Status', align: 'left' as const },
    { label: 'Utilization (30d)', align: 'left' as const },
    { label: 'Daily rate', align: 'right' as const },
    { label: '', align: 'right' as const },
  ]
}

function meterTone(utilization: number): string {
  if (utilization >= 0.7) return 'var(--color-success)'
  if (utilization >= 0.4) return 'var(--color-warning)'
  return 'var(--color-error)'
}

export function vehicleRow(v: VehicleTuple): Row {
  const [name, subtitle, plate, vin, location, status, dailyRate, utilization] = v
  const pct = Math.round(utilization * 100)

  return {
    key: plate,
    cells: [
      { kind: 'avatar', primary: name, secondary: subtitle, initials: name.slice(0, 2).toUpperCase(), avatarBg: 'var(--color-surface-3)', avatarFg: 'var(--color-fg-3)', avatarRadius: '8px', subFontMono: false },
      { kind: 'stack', primary: plate, secondary: vin, weight: 500, subFontMono: true },
      { kind: 'text', primary: location },
      { kind: 'badge', status },
      { kind: 'meter', primary: `${pct}%`, pct: `${pct}%`, tone: meterTone(utilization) },
      { kind: 'amount', primary: dailyRate, align: 'right', tone: 'var(--color-foreground)' },
      { kind: 'actions', align: 'right' },
    ],
  }
}
