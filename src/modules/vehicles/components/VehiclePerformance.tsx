import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { formatCurrency } from '../utils/vehicle.utils'
import type { Vehicle } from '../types/vehicle.types'

function Meter({ label, value, pct, note, tone }: { label: string; value: string; pct: number; note: string; tone: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold">{label}</span>
        <span className="text-[13px] font-semibold tabular-nums">{value}</span>
      </div>
      <span className="bg-surface-3 h-1.5 overflow-hidden rounded-full">
        <span className="block h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: tone }} />
      </span>
      <span className="text-fg-4 text-[11.5px]">{note}</span>
    </div>
  )
}

/**
 * Mock month-over-month delta until revenue history exists per vehicle. Deterministic from the
 * vehicle id (stable across renders) and biased by utilization, so a busy vehicle reads as
 * trending up and an idle one reads as trending down — plausible, not random.
 */
function bookedValueTrend(vehicle: Vehicle): number {
  const seed = [...vehicle.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  const spread = (seed % 21) - 10 // -10..+10
  return Math.round((vehicle.utilization - 0.5) * 40 + spread)
}

interface VehiclePerformanceProps {
  vehicle: Vehicle
  /** Fleet-wide mean utilization (0–1), for the "fleet average" comparison line. */
  fleetUtilization: number
  revenue: number
  daysOnRent: number
}

export function VehiclePerformance({ vehicle, fleetUtilization, revenue, daysOnRent }: VehiclePerformanceProps) {
  const pct = Math.round(vehicle.utilization * 100)
  const utilizationTone = pct >= 70 ? 'var(--color-success)' : pct >= 40 ? 'var(--color-warning)' : 'var(--color-error)'
  const trend = bookedValueTrend(vehicle)
  const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown

  return (
    <Card className="flex flex-col gap-4 p-[18px]">
      <PanelHeading title="Performance" description="Last 30 days" />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-meta text-fg-3 mb-1">Revenue</p>
          <p className="text-stat-md">{formatCurrency(revenue)}</p>
          <span
            className="mt-1.5 inline-flex items-center gap-[3px] rounded-full py-px pr-1.5 pl-1 text-[11.5px] font-semibold tabular-nums"
            style={{
              background: trend >= 0 ? 'var(--color-success-tint)' : 'var(--color-error-tint)',
              color: trend >= 0 ? 'var(--color-success)' : 'var(--color-error)',
            }}
          >
            <TrendIcon className="size-[11px]" strokeWidth={2.75} />
            {trend >= 0 ? '+' : ''}
            {trend}% vs last month
          </span>
        </div>
        <div>
          <p className="text-meta text-fg-3 mb-1">Days on rent</p>
          <p className="text-stat-md">
            {daysOnRent}
            <span className="text-fg-4 ml-1 text-[13px] font-normal">/ 30</span>
          </p>
        </div>
      </div>

      <div className="border-border-soft flex flex-col gap-4 border-t pt-4">
        <Meter label="Utilization (30d)" value={`${pct}%`} pct={pct} note={`Fleet average ${Math.round(fleetUtilization * 100)}%`} tone={utilizationTone} />
      </div>
    </Card>
  )
}
