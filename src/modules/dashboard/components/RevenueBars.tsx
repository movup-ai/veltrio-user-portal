import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { useFormatters } from '@/i18n'
import { REVENUE_14D } from '../mock/dashboard.mock'

/** The 14-day window the mock series covers — replace with real dates once revenue history exists. */
const SERIES_START = new Date(2026, 8, 1)

function dayInSeries(offset: number): Date {
  const date = new Date(SERIES_START)
  date.setDate(SERIES_START.getDate() + offset)
  return date
}

export function RevenueBars() {
  const { t } = useTranslation('dashboard')
  const format = useFormatters()
  const max = Math.max(...REVENUE_14D)

  return (
    <Card className="flex min-w-0 flex-[2_1_340px] flex-col px-[18px] pt-[18px] pb-3.5">
      <div className="flex flex-wrap items-start gap-3.5">
        <PanelHeading title={t('revenue.title')} description={t('revenue.description')} className="min-w-0 flex-1" />
        <div className="text-right">
          <div className="font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.02em] tabular-nums">
            {format.currency(71540)}
          </div>
          <div className="text-fg-3 text-[11.5px] tabular-nums">{t('revenue.delta')}</div>
        </div>
      </div>

      <div className="border-border mt-5 flex h-[168px] flex-1 items-end gap-[7px] border-b pb-0.5">
        {REVENUE_14D.map((v, i) => (
          <div
            key={i}
            title={`${format.shortDate(dayInSeries(i))} · ${format.currency(Math.round(v * 1000))}`}
            className="flex h-full min-w-0 flex-1 flex-col justify-end gap-[5px]"
          >
            <span className="text-fg-4 text-center text-[10px] tabular-nums" style={{ opacity: i % 2 === 0 ? 1 : 0 }}>
              {i + 1}
            </span>
            <span
              className={`hover:bg-primary block w-full rounded-t-[5px] rounded-b-[2px] transition-colors ${
                i >= REVENUE_14D.length - 3 ? 'bg-primary' : 'bg-bar-dim'
              }`}
              style={{ height: `${Math.round((v / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="text-fg-4 mt-2 flex justify-between font-mono text-[11px]">
        <span>{format.shortDate(dayInSeries(0))}</span>
        <span>{format.shortDate(dayInSeries(6))}</span>
        <span>{format.shortDate(dayInSeries(13))}</span>
      </div>
    </Card>
  )
}
