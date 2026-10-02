import { ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { useDomainLabels } from '@/i18n/domain'
import { FLEET_DONUT_GRADIENT, FLEET_STATUS } from '../mock/dashboard.mock'

export function FleetStatusCard() {
  const { t } = useTranslation('dashboard')
  const domain = useDomainLabels()
  const navigate = useNavigate()

  return (
    <Card className="flex min-w-0 flex-[1_1_260px] flex-col p-[18px]">
      <PanelHeading
        title={t('fleet.title')}
        description={t('fleet.description', { vehicles: 142, locations: 3 })}
      />

      <div className="mt-[18px] flex flex-wrap items-center gap-5">
        <div className="relative size-[124px] shrink-0 rounded-full" style={{ background: FLEET_DONUT_GRADIENT }}>
          <div className="bg-surface absolute inset-[17px] flex flex-col items-center justify-center rounded-full">
            <span className="text-[22px] leading-none font-bold tracking-[-0.02em] tabular-nums">74%</span>
            <span className="text-fg-4 mt-0.5 text-[10.5px]">{t('fleet.utilized')}</span>
          </div>
        </div>
        <div className="flex min-w-[140px] flex-1 flex-col gap-[9px]">
          {FLEET_STATUS.map((f) => (
            <div key={f.status} className="flex items-center gap-[9px]">
              <span className="size-[9px] shrink-0 rounded-[3px]" style={{ background: f.color }} />
              <span className="text-fg-2 flex-1 text-[12.5px] whitespace-nowrap">{domain.status(f.status)}</span>
              <span className="shrink-0 text-[12.5px] font-semibold tabular-nums">{f.count}</span>
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
