import { Check, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ToneBadge } from '@/components/data-display/ToneBadge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SETUP_STEPS } from '../constants/setup.constants'
import type { SetupStep } from '../types/setup.types'

interface SetupStepListProps {
  steps: SetupStep[]
  /** Offered beside the agreement: the starter one is valid as it stands, so reading it is enough. */
  onReviewAgreement?: () => void
  reviewing?: boolean
  className?: string
}

export function SetupStepList({ steps, onReviewAgreement, reviewing, className }: SetupStepListProps) {
  const { t } = useTranslation('dashboard')

  return (
    <ul
      className={cn(
        'border-border divide-border m-0 list-none divide-y overflow-hidden rounded-lg border p-0',
        className,
      )}
    >
      {steps.map(({ key, status }) => {
        const { icon: Icon, to } = SETUP_STEPS[key]
        const done = status === 'done'
        return (
          <li key={key} className="flex flex-col sm:flex-row sm:items-center">
            <Link
              to={to}
              className="hover:bg-surface-2 flex min-w-0 flex-1 items-center gap-3.5 px-4 py-3.5 transition-colors"
            >
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-md',
                  done ? 'bg-success-tint text-success' : 'bg-tint text-primary',
                )}
              >
                {done ? (
                  <Check className="size-[18px]" strokeWidth={2.5} aria-hidden />
                ) : (
                  <Icon className="size-[18px]" aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('text-label block', done ? 'text-fg-3' : 'text-foreground')}>
                  {t(`setup.steps.${key}.title`)}
                  {done && <span className="sr-only">{` (${t('setup.done')})`}</span>}
                </span>
                <span className="text-caption text-fg-3 block">{t(`setup.steps.${key}.description`)}</span>
              </span>
              {status === 'pending' ? (
                <ToneBadge tone="info">{t('setup.inReview')}</ToneBadge>
              ) : (
                !done && <ChevronRight className="text-fg-4 size-4 shrink-0" aria-hidden />
              )}
            </Link>
            {key === 'agreement' && status === 'todo' && onReviewAgreement && (
              <Button
                variant="outline"
                size="sm"
                // Under the text on a phone, lined up with it: the row is too narrow beside it.
                className="mb-3.5 ml-[66px] shrink-0 self-start sm:my-0 sm:mr-4 sm:ml-0 sm:self-auto"
                disabled={reviewing}
                onClick={onReviewAgreement}
              >
                {t('setup.markReviewed')}
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
