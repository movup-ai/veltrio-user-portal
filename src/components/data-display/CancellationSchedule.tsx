import { useTranslation } from 'react-i18next'
import { policyRows, type CancellationPolicy, type PolicyRow } from '@/lib/cancellation-policy'
import { cn } from '@/lib/utils'

interface CancellationScheduleProps {
  policy: CancellationPolicy
  className?: string
}

/** A cancellation policy spelled out the way a renter reads it: notice, then what comes back. */
export function CancellationSchedule({ policy, className }: CancellationScheduleProps) {
  const { t } = useTranslation('common')

  const notice = (row: PolicyRow) => {
    if (row.to === undefined) {
      return row.from === 0
        ? t('cancellationPolicy.anyTime')
        : t('cancellationPolicy.atLeast', { count: row.from })
    }
    if (row.from === 0) return t('cancellationPolicy.lessThan', { count: row.to + 1 })
    return row.from === row.to
      ? t('cancellationPolicy.exactly', { count: row.from })
      : t('cancellationPolicy.between', { from: row.from, to: row.to })
  }

  return (
    <ul
      className={cn(
        'border-border divide-border m-0 list-none divide-y overflow-hidden rounded-[10px] border p-0 text-[13px]',
        className,
      )}
    >
      {policyRows(policy).map((row) => (
        <li key={row.from} className="flex items-center justify-between gap-3 px-3 py-2">
          <span>{notice(row)}</span>
          <span
            className={cn(
              'shrink-0 font-semibold tabular-nums',
              row.refundPercent === 100 && 'text-success',
              row.refundPercent === 0 && 'text-error',
            )}
          >
            {row.refundPercent === 0
              ? t('cancellationPolicy.noRefund')
              : t('cancellationPolicy.refund', { percent: row.refundPercent })}
          </span>
        </li>
      ))}
    </ul>
  )
}
