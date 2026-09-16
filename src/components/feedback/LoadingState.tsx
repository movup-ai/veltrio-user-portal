import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export function LoadingState({ label, className }: { label?: string; className?: string }) {
  const { t } = useTranslation('common')

  return (
    <div
      role="status"
      className={cn('flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground', className)}
    >
      <Loader2 className="size-6 animate-spin" aria-hidden />
      <p className="text-description">{label ?? t('states.loading')}</p>
    </div>
  )
}
