import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { useFormatters } from '@/i18n'
import type { Vehicle } from '../types/vehicle.types'

function Meter({
  label,
  value,
  pct,
  note,
  tone,
}: {
  label: string
  value: string
  pct: number
  note: string
  tone: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold">{label}</span>
        <span className="text-[13px] font-semibold tabular-nums">{value}</span>
      </div>
      <span className="bg-surface-3 h-1.5 overflow-hidden rounded-full">
        <span
          className="block h-full rounded-full"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: tone }}
        />
      </span>
      <span className="text-fg-4 text-[11.5px]">{note}</span>
    </div>
  )
}

interface VehiclePerformanceProps {
  vehicle: Vehicle
  /** Fleet-wide mean utilization (0–1), for the "fleet average" comparison line. */
  fleetUtilization: number
  revenue: number
  daysOnRent: number
}

export function VehiclePerformance({
  vehicle,
  fleetUtilization,
  revenue,
  daysOnRent,
}: VehiclePerformanceProps) {
  const { t } = useTranslation('vehicles')
  const format = useFormatters()
  const pct = Math.round(vehicle.utilization * 100)
  const utilizationTone =
    pct >= 70 ? 'var(--color-success)' : pct >= 40 ? 'var(--color-warning)' : 'var(--color-error)'

  return (
    <Card className="flex flex-col gap-4 p-[18px]">
      <PanelHeading title={t('performance.title')} description={t('performance.description')} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-meta text-fg-3 mb-1">{t('performance.revenue')}</p>
          <p className="text-stat-md">{format.currency(revenue)}</p>
        </div>
        <div>
          <p className="text-meta text-fg-3 mb-1">{t('performance.daysOnRent')}</p>
          <p className="text-stat-md">
            {daysOnRent}
            <span className="text-fg-4 ml-1 text-[13px] font-normal">{t('performance.outOf30')}</span>
          </p>
        </div>
      </div>

      <div className="border-border-soft flex flex-col gap-4 border-t pt-4">
        <Meter
          label={t('performance.utilization30d')}
          value={`${pct}%`}
          pct={pct}
          note={t('performance.fleetAverage', { value: Math.round(fleetUtilization * 100) })}
          tone={utilizationTone}
        />
      </div>
    </Card>
  )
}
