import { useTranslation } from 'react-i18next'
import { Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReviewRowProps {
  label: string
  value: React.ReactNode
}

/** Label/value line used throughout the vehicle form's Review step. */
export function ReviewRow({ label, value }: ReviewRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-fg-3 text-[13px]">{label}</span>
      <span className="text-[13px] font-semibold">{value}</span>
    </div>
  )
}

interface ReviewSectionProps {
  title: string
  count?: number
  className?: string
  /** Renders an Edit action in the title row — typically jumps back to the step that owns these fields. */
  onEdit?: () => void
  children: React.ReactNode
}

/** Titled, top-bordered group used to lay out the vehicle form's Review step into sections. */
export function ReviewSection({ title, count, className, onEdit, children }: ReviewSectionProps) {
  const { t } = useTranslation('common')

  return (
    <div className={cn('border-border-soft border-t pt-5', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[14px] font-semibold">
          {title}
          {count != null && <span className="text-fg-4 ml-1 font-normal">({count})</span>}
        </p>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`${t('actions.edit')} — ${title}`}
            className="text-fg-3 hover:bg-surface-3 hover:text-foreground -my-1 flex shrink-0 items-center gap-1.5 rounded-[7px] px-2 py-1 text-[12.5px] font-semibold transition-colors"
          >
            <Pencil className="size-3" aria-hidden />
            {t('actions.edit')}
          </button>
        )}
      </div>
      {children}
    </div>
  )
}
