import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageActionButtonProps {
  icon?: LucideIcon
  label: string
  onClick?: () => void
  /** 'surface' (default) is the outline chrome used next to page titles; 'solid' is the primary teal CTA (Save changes). */
  variant?: 'surface' | 'solid'
  className?: string
}

/** Secondary/primary action button shown next to page titles and in panel footers (Export, Add vehicle, Save changes, ...). */
export function PageActionButton({ icon: Icon, label, onClick, variant = 'surface', className }: PageActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-meta flex h-[34px] shrink-0 items-center gap-[7px] rounded-[9px] px-3 whitespace-nowrap transition-colors',
        variant === 'solid'
          ? 'bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover'
          : 'bg-surface border-border text-fg-2 hover:bg-surface-3 hover:text-foreground border',
        className,
      )}
    >
      {Icon && <Icon className="size-[15px]" />}
      <span>{label}</span>
    </button>
  )
}
