import { ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { useDomainLabels } from '@/i18n/domain'
import { useFormatters } from '@/i18n'
import type { VehicleStats, VehicleStatus } from '@/modules/vehicles/types/vehicle.types'

// Archived cars are outside the stats' default filter, so they never appear here.
const SEGMENTS: { status: VehicleStatus; color: string; outlined?: boolean }[] = [
  { status: 'On rent', color: 'var(--color-primary)' },
  { status: 'Available', color: 'var(--color-surface-3)', outlined: true },
  { status: 'Maintenance', color: 'var(--color-warning)' },
  { status: 'Out of service', color: 'var(--color-border-strong)' },
]

function donut(stats: VehicleStats): string {
  if (stats.total === 0) return 'var(--color-surface-3)'
  let start = 0
  const stops = SEGMENTS.map(({ status, color }) => {
    const end = start + (stats.byStatus[status] / stats.total) * 100
    const stop = `${color} ${start}% ${end}%`
    start = end
    return stop
  })
  return `conic-gradient(${stops.join(', ')})`
}

export function FleetStatusCard({ stats, locations }: { stats?: VehicleStats; locations?: number }) {
  const { t } = useTranslation('dashboard')
  const domain = useDomainLabels()
  const format = useFormatters()
  const navigate = useNavigate()
  const onRent = stats ? Math.round((stats.byStatus['On rent'] / Math.max(stats.total, 1)) * 100) : undefined

  return (
    <Card className="flex min-w-0 flex-[1_1_260px] flex-col p-[18px]">
      <PanelHeading
        title={t('fleet.title')}
        description={
          stats && locations !== undefined
            ? t('fleet.description', {
                vehicles: t('fleet.vehicles', { count: stats.total }),
                locations: t('fleet.locations', { count: locations }),
              })
            : undefined
        }
      />

      <div className="mt-[18px] flex flex-wrap items-center gap-5">
        <div
          className="relative size-[124px] shrink-0 rounded-full"
          style={{ background: stats ? donut(stats) : 'var(--color-surface-3)' }}
        >
          <div className="bg-surface absolute inset-[17px] flex flex-col items-center justify-center rounded-full">
            <span className="text-[22px] leading-none font-bold tracking-[-0.02em] tabular-nums">
              {onRent === undefined ? '—' : format.percent(onRent)}
            </span>
            <span className="text-fg-4 mt-0.5 text-[10.5px]">{t('fleet.onRentNow')}</span>
          </div>
        </div>
        <div className="flex min-w-[140px] flex-1 flex-col gap-[9px]">
          {SEGMENTS.map((s) => (
            <div key={s.status} className="flex items-center gap-[9px]">
              <span
                className="size-[9px] shrink-0 rounded-[3px]"
                // The outline keeps the light "Available" swatch visible against the card.
                style={{
                  background: s.color,
                  boxShadow: s.outlined ? 'inset 0 0 0 1px var(--color-border-strong)' : undefined,
                }}
              />
              <span className="text-fg-2 flex-1 text-[12.5px] whitespace-nowrap">
                {domain.status(s.status)}
              </span>
              <span className="shrink-0 text-[12.5px] font-semibold tabular-nums">
                {stats ? format.number(stats.byStatus[s.status]) : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={() => navigate('/vehicles')}
          className="border-border text-fg-2 hover:bg-surface-2 hover:text-foreground flex h-[34px] w-full items-center justify-center gap-1.5 rounded-[9px] border text-[12.5px] font-semibold transition-colors"
        >
          <span>{t('fleet.openFleet')}</span>
          <ArrowUpRight className="size-3.5" />
        </button>
      </div>
    </Card>
  )
}
