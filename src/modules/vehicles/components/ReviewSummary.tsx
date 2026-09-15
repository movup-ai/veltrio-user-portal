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
  children: React.ReactNode
}

/** Titled, top-bordered group used to lay out the vehicle form's Review step into sections. */
export function ReviewSection({ title, count, className, children }: ReviewSectionProps) {
  return (
    <div className={cn('border-border-soft border-t pt-5', className)}>
      <p className="text-meta text-fg-3 mb-3">
        {title}
        {count != null && ` (${count})`}
      </p>
      {children}
    </div>
  )
}
