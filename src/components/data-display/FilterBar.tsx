import { ChevronDown, Search, SlidersHorizontal } from 'lucide-react'

interface FilterDef {
  label: string
  value: string
}

interface FilterBarProps {
  searchPlaceholder: string
  filters: FilterDef[]
}

export function FilterBar({ searchPlaceholder, filters }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <label className="bg-surface border-border focus-within:border-primary flex h-9 min-w-0 max-w-[340px] flex-[1_1_220px] items-center gap-2 rounded-[9px] border px-[11px] focus-within:shadow-[0_0_0_3px_var(--color-tint)]">
        <Search className="text-fg-4 size-[15px] shrink-0" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-foreground outline-none"
        />
      </label>

      {filters.map((f) => (
        <button
          key={f.label}
          type="button"
          className="bg-surface border-border text-fg-2 hover:bg-surface-3 hover:text-foreground flex h-9 shrink-0 items-center gap-2 rounded-[9px] border px-[11px] text-[13px] whitespace-nowrap transition-colors"
        >
          <span className="text-fg-4">{f.label}</span>
          <span className="font-semibold">{f.value}</span>
          <ChevronDown className="text-fg-4 size-3.5" />
        </button>
      ))}

      <div className="flex-1" />

      <button
        type="button"
        className="text-fg-3 hover:text-foreground hover:border-fg-4 flex h-9 shrink-0 items-center gap-[7px] rounded-[9px] border border-dashed border-[var(--color-border-strong)] px-[11px] text-[12.5px] font-semibold whitespace-nowrap transition-colors"
      >
        <SlidersHorizontal className="size-3.5" />
        <span>More filters</span>
      </button>
    </div>
  )
}
