import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  label?: string
  /** Hides the caption, leaving only the spinner. The label still announces to screen readers. */
  hideLabel?: boolean
  className?: string
}

export function LoadingState({ label, hideLabel, className }: LoadingStateProps) {
  const { t } = useTranslation('common')
  const text = label ?? t('states.loading')

  return (
    <div
      role="status"
      aria-label={hideLabel ? text : undefined}
      className={cn('flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground', className)}
    >
      <Loader2 className="size-6 animate-spin" aria-hidden />
      {!hideLabel && <p className="text-description">{text}</p>}
    </div>
  )
}
