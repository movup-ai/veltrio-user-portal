import { useRef } from 'react'
import { ArrowUpDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { FilterOption } from './FilterBar'

interface SortSelectProps {
  /** Screen-reader name for the trigger, e.g. "Sort bookings". */
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
  className?: string
}

/** Sort control for a table header row, sized to match the filter chips above it. */
export function SortSelect({ label, value, options, onChange, className }: SortSelectProps) {
  const current = options.find((o) => o.value === value)

  /**
   * Radix hands focus back to the trigger when the menu closes, and the browser counts that
   * programmatic focus as `:focus-visible` — so picking an option with the mouse left a focus
   * ring drawn around the button. Suppressed for pointer interactions only; a keyboard user
   * still gets the ring, and still needs somewhere for focus to land.
   */
  const viaPointer = useRef(false)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onPointerDown={() => (viaPointer.current = true)}
          onKeyDown={() => (viaPointer.current = false)}
          className={cn(
            'bg-surface border-border text-fg-2 hover:bg-surface-3 hover:text-foreground flex h-9 shrink-0 items-center gap-2 rounded-[9px] border px-3 text-[13px] whitespace-nowrap transition-colors',
            className,
          )}
        >
          <ArrowUpDown className="text-fg-4 size-3.5 shrink-0" aria-hidden />
          <span className="font-semibold">{current?.label ?? value}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onPointerDown={() => (viaPointer.current = true)}
        onKeyDown={() => (viaPointer.current = false)}
        onCloseAutoFocus={(e) => {
          if (viaPointer.current) e.preventDefault()
        }}
      >
        {options.map((opt) => (
          <DropdownMenuItem key={opt.value} onSelect={() => onChange(opt.value)} className="gap-4">
            <span className="flex-1">{opt.label}</span>
            {/* Held in the layout even when hidden, so the labels don't shift as the choice moves. */}
            <Check className={cn('size-3.5 shrink-0', opt.value !== value && 'invisible')} aria-hidden />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
