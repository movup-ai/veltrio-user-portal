import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFormatters } from '@/i18n'
import type { RatePlan } from '../utils/rate-plan'

/**
 * Says so when the engine priced part of a rental itself rather than straight from a rate the
 * operator entered: an hourly day it capped, or a package it repeated. Renders nothing otherwise.
 */
export function RatePlanNotice({ plan }: { plan: RatePlan }) {
  const { t } = useTranslation('vehicles')
  const format = useFormatters()

  // A Set: two hourly options with the same label and price would say the same thing twice.
  const notices = new Set([
    ...plan.lines
      .filter((line) => line.cappedHours)
      .map((line) =>
        t('ratePlan.notice.capped', {
          label: line.option.label,
          hours: line.cappedHours,
          price: format.currency(line.option.rate),
        }),
      ),
    ...(plan.kind === 'repeat'
      ? [t('ratePlan.notice.repeated', { label: plan.lines[0].option.label, count: plan.lines[0].count })]
      : []),
  ])
  if (notices.size === 0) return null

  return (
    <div role="note" className="bg-info-tint text-info flex gap-2 rounded-[9px] px-3.5 py-2.5 text-[12.5px]">
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <div className="flex flex-col gap-1">
        {[...notices].map((notice) => (
          <p key={notice}>{notice}</p>
        ))}
      </div>
    </div>
  )
}
