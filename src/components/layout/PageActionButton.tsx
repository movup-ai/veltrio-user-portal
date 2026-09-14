import type { LucideIcon } from 'lucide-react'

interface PageActionButtonProps {
  icon: LucideIcon
  label: string
  onClick?: () => void
}

/** Secondary action button shown next to the page title (Export, Calendar view, Import CSV, ...). */
export function PageActionButton({ icon: Icon, label, onClick }: PageActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-surface border-border text-fg-2 hover:bg-surface-3 hover:text-foreground flex h-[34px] items-center gap-[7px] rounded-[9px] border px-3 text-[12.5px] font-semibold whitespace-nowrap transition-colors"
    >
      <Icon className="size-[15px]" />
      <span>{label}</span>
    </button>
  )
}
