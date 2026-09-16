import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Sparkline } from '@/components/data-display/Sparkline'
import type { KpiDef } from '../mock/dashboard.mock'

export function KpiCard({ icon: Icon, labelKey, value, delta, noteKey, up, spark }: KpiDef & { icon: LucideIcon }) {
  const { t } = useTranslation('dashboard')

  return (
    <Card hoverable className="flex flex-col gap-2.5 px-4 pt-[15px] pb-3">
      <div className="flex items-center gap-2">
        <Icon className="text-fg-4 size-[15px]" />
        <span className="text-fg-3 text-xs font-semibold">{t(`kpi.${labelKey}`)}</span>
      </div>
      <div className="flex items-end justify-between gap-2.5">
        <div>
          <div className="text-stat-lg tabular-nums">{value}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-[3px] rounded-full py-px pr-1.5 pl-1 text-[11.5px] font-semibold tabular-nums"
              style={{
                background: up ? 'var(--color-success-tint)' : 'var(--color-error-tint)',
                color: up ? 'var(--color-success)' : 'var(--color-error)',
              }}
            >
              {up ? <TrendingUp className="size-[11px]" strokeWidth={2.75} /> : <TrendingDown className="size-[11px]" strokeWidth={2.75} />}
              {delta}
            </span>
            <span className="text-fg-4 text-[11.5px]">{t(`kpi.${noteKey}`)}</span>
          </div>
        </div>
        <Sparkline points={spark} color={up ? 'var(--color-success)' : 'var(--color-error)'} />
      </div>
    </Card>
  )
}
