import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { useFormatters } from '@/i18n'
import { parseDay } from '@/utils/dates'
import { percentChange, roundedPercent, type RecentRevenue } from '../utils/dashboard.utils'

interface RevenueBarsProps {
  recent?: RecentRevenue
  isError: boolean
  onRetry: () => void
}

export function RevenueBars({ recent, isError, onRetry }: RevenueBarsProps) {
  const { t } = useTranslation('dashboard')
  const format = useFormatters()
  // Local midnight of a bare day, not UTC's: west of Greenwich that would label the day before.
  const short = (day: string) => format.shortDate(parseDay(day))
  const long = (day: string) =>
    format.date(parseDay(day), { weekday: 'long', month: 'short', day: 'numeric' })
  const max = Math.max(1, ...(recent?.days ?? []).map((d) => d.collected))
  const change = recent && percentChange(recent.total, recent.previousTotal)
  const last = (recent?.days.length ?? 0) - 1

  return (
    <Card className="flex min-w-0 flex-[2_1_340px] flex-col px-[18px] pt-[18px] pb-3.5">
      <div className="flex flex-wrap items-start gap-3.5">
        <PanelHeading
          title={t('revenue.title')}
          description={t('revenue.description')}
          className="min-w-0 flex-1"
        />
        {recent && (
          <div className="text-right">
            <div className="font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.02em] tabular-nums">
              {format.currency(Math.round(recent.total))}
            </div>
            <div className="text-fg-3 text-[11.5px] tabular-nums">
              {change === undefined
                ? t('revenue.previousAmount', { amount: format.currency(Math.round(recent.previousTotal)) })
                : t('revenue.previousChange', {
                    change: `${change >= 0 ? '+' : '−'}${format.number(Math.abs(roundedPercent(change)))}%`,
                  })}
            </div>
          </div>
        )}
      </div>

      {isError ? (
        <ErrorState className="mt-5 flex-1 py-8" onRetry={onRetry} />
      ) : !recent ? (
        <LoadingState className="mt-5 flex-1 py-8" hideLabel />
      ) : (
        <>
          {/* A minimum, not a height: alone in its row on a phone, flex-1 shrank a fixed one to 0. */}
          <div className="border-border relative mt-5 flex min-h-[168px] flex-1 items-end gap-[7px] border-b pb-0.5">
            {recent.total === 0 && (
              <p className="text-fg-4 pointer-events-none absolute inset-x-0 top-1/3 m-0 text-center text-[12.5px]">
                {t('revenue.none')}
              </p>
            )}
            {recent.days.map((d, i) => (
              <Tooltip key={d.day} delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${long(d.day)}: ${format.currency(d.collected)}`}
                    // The whole column is the target: a quiet day's bar is too thin to point at.
                    className="group hover:bg-surface-2 focus-visible:bg-surface-2 flex h-full min-w-0 flex-1 flex-col justify-end gap-[5px] rounded-t-[6px] outline-none"
                  >
                    <span
                      className="text-fg-4 text-center text-[10px] tabular-nums"
                      style={{ opacity: i % 2 === 0 ? 1 : 0 }}
                    >
                      {Number(d.day.slice(8))}
                    </span>
                    <span
                      className={`group-hover:bg-primary group-focus-visible:bg-primary block w-full rounded-t-[5px] rounded-b-[2px] transition-colors ${
                        i === last ? 'bg-primary' : 'bg-bar-dim'
                      }`}
                      // A sliver for a day with nothing taken, so the day still shows.
                      style={{ height: `${Math.max(2, Math.round((d.collected / max) * 100))}%` }}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="px-3 py-2">
                  <div className="text-[11px] opacity-75">
                    {i === last ? t('revenue.todayLong', { date: long(d.day) }) : long(d.day)}
                  </div>
                  <div className="mt-0.5 text-[13px] font-semibold tabular-nums">
                    {format.currency(d.collected)}
                  </div>
                  <div className="text-[11px] opacity-75">{t('revenue.collected')}</div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          <div className="text-fg-4 mt-2 flex justify-between font-mono text-[11px]">
            <span>{short(recent.days[0].day)}</span>
            <span>{short(recent.days[Math.floor(last / 2)].day)}</span>
            <span>{t('revenue.today')}</span>
          </div>
        </>
      )}
    </Card>
  )
}
