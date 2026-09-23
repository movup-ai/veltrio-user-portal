import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  /** Overrides "Retry" where the action moves on rather than trying again. */
  actionLabel?: string
  className?: string
}

export function ErrorState({
  title,
  description,
  onRetry,
  actionLabel,
  className,
}: ErrorStateProps) {
  const { t } = useTranslation('common')

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-border px-6 py-16 text-center',
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-error/10 text-error">
        <AlertTriangle className="size-6" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-card-title">{title ?? t('states.errorTitle')}</p>
        <p className="max-w-sm text-description">{description ?? t('states.errorDescription')}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          {actionLabel ?? t('actions.retry')}
        </Button>
      )}
    </div>
  )
}
