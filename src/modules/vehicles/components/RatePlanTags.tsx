import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { isAutomatic, type RatePlan } from '../utils/rate-plan'
import { formatPlanLines, planLineNames } from '../utils/vehicle.utils'

const CHIP = 'rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap'

/**
 * Which rule priced a rental, as chips: the rates chosen (tinted by whether they were an exact
 * match or a combination), the discount tier if one fired, and "Auto" when the engine priced part
 * of it itself. Lets the counter read the cost engine's reasoning off the quote.
 */
export function RatePlanTags({ plan, className }: { plan: RatePlan; className?: string }) {
  const { t } = useTranslation('vehicles')
  const lines = planLineNames(plan.lines)

  return (
    <span className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <span
        className={cn(
          CHIP,
          plan.kind === 'exact' ? 'bg-success-tint text-success' : 'bg-info-tint text-info',
        )}
      >
        {plan.kind === 'exact'
          ? t('ratePlan.exactMatch', { label: lines[0].label })
          : formatPlanLines(lines, t)}
      </span>
      {plan.discount && (
        <span className={cn(CHIP, 'bg-warning-tint text-warning')}>
          {t('ratePlan.discount', { days: plan.discount.minDays, pct: plan.discount.percentOff })}
        </span>
      )}
      {isAutomatic(plan) && (
        <span className={cn(CHIP, 'bg-neutral-tint text-fg-2')}>{t('ratePlan.automatic')}</span>
      )}
    </span>
  )
}
