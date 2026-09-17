import { useTranslation } from 'react-i18next'
import { Pencil } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ReviewRowProps {
  label: string
  value: React.ReactNode
}

/**
 * Label-above-value cell, mirroring the Specifications panel on the vehicle details page.
 * Stacked rather than label-left/value-right so the pair stays legible at any card width —
 * a justified row strands the value at the far edge once the card gets wide.
 */
export function ReviewRow({ label, value }: ReviewRowProps) {
  return (
    <div className="border-border-soft min-w-0 border-b pb-2.5">
      <p className="text-fg-3 mb-1 text-[13px] font-semibold">{label}</p>
      <p className="text-[13.5px] font-semibold break-words">{value}</p>
    </div>
  )
}

/** Matches the `gap-x-5` below — the column-cap maths has to subtract the real gutters. */
const COLUMN_GAP_PX = 20

interface ReviewRowGridProps {
  children: React.ReactNode
  /** Upper bound on columns. Past four, cells stretch so wide the label and value stop reading as a pair. */
  maxColumns?: number
}

/**
 * Grid wrapper for ReviewRow cells — fills the card's width instead of stacking one per line,
 * but never exceeds `maxColumns`. Forcing each track to be at least a whole fraction of the
 * container is what caps the count; below that the 140px floor takes over and auto-fit packs
 * in as many as genuinely fit.
 */
export function ReviewRowGrid({ children, maxColumns = 4 }: ReviewRowGridProps) {
  const gutters = (maxColumns - 1) * COLUMN_GAP_PX

  return (
    <div
      className="grid gap-x-5 gap-y-3.5"
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(max(140px, (100% - ${gutters}px) / ${maxColumns}), 1fr))` }}
    >
      {children}
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

/** Titled card used to lay out the vehicle form's Review step into distinct, scannable sections. */
export function ReviewSection({ title, count, className, onEdit, children }: ReviewSectionProps) {
  const { t } = useTranslation('common')

  return (
    <Card className={cn('flex flex-col p-4 shadow-none', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[15.5px] font-semibold">
          {title}
          {count != null && <span className="text-fg-4 ml-1 font-normal">({count})</span>}
        </p>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`${t('actions.edit')} — ${title}`}
            className="text-fg-3 hover:bg-surface-3 hover:text-foreground -my-1 flex shrink-0 items-center gap-1.5 rounded-[7px] px-2 py-1 text-[13.5px] font-semibold transition-colors"
          >
            <Pencil className="size-3" aria-hidden />
            {t('actions.edit')}
          </button>
        )}
      </div>
      {children}
    </Card>
  )
}
