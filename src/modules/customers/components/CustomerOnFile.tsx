import { useTranslation } from 'react-i18next'
import { useFormatters } from '@/i18n'
import { cn } from '@/lib/utils'
import { DAY_FORMAT } from '@/lib/date-format'
import type { Customer, MatchReason } from '../types/customer.types'

interface Props {
  customer: Customer
  /** Why they are being shown, when they were found by matching. */
  reasons?: MatchReason[]
  action?: React.ReactNode
  /** `lg` where the box is itself the choice, as in the merge dialog. */
  size?: 'md' | 'lg'
}

/** One customer already on file, with enough to tell at a glance whether it is the same person. */
export function CustomerOnFile({ customer, reasons, action, size = 'md' }: Props) {
  const { t } = useTranslation('customers')
  const format = useFormatters()
  const large = size === 'lg'
  const line = cn('text-fg-3 m-0', large ? 'text-[13px]' : 'text-caption')

  return (
    // Wraps rather than shrinks: beside two buttons on a phone, the details were squeezed to ~70px.
    <div
      className={cn(
        'border-border-soft flex flex-wrap items-start gap-3 rounded-md border',
        large ? 'p-4' : 'p-3',
      )}
    >
      <div className={cn('min-w-0 grow basis-48', large && 'flex flex-col gap-1')}>
        <p className={cn('m-0 truncate font-medium', large ? 'text-[15px]' : 'text-[13px]')}>
          {customer.name}
        </p>
        <p className={cn(line, 'truncate')}>
          {customer.email} · {customer.phone}
        </p>
        <p className={line}>
          {t('onFile.born', { date: format.date(`${customer.dateOfBirth}T00:00:00`, DAY_FORMAT) })} ·{' '}
          <span className="font-mono">{customer.licenceNumber}</span>
        </p>
        {reasons && reasons.length > 0 && (
          <p className="text-warning m-0 mt-1 text-caption">
            {t('onFile.matchedOn', {
              reasons: reasons.map((reason) => t(`matchReason.${reason}`)).join(', '),
            })}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
