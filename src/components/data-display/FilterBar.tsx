import { useState } from 'react'
import { Check, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/**
 * `value` is the canonical (English) value the caller filters on; `label` is what the user
 * sees. Keeping them separate is what lets the UI translate while the query stays stable.
 */
export interface FilterOption {
  value: string
  label: string
}

interface FilterDef {
  label: string
  /** Display text for the current selection. */
  value: string
  /** When provided (with onChange), the filter renders as a working dropdown instead of a static display. */
  options?: FilterOption[]
  onChange?: (value: string) => void
}

/** A single-select dropdown row inside the "More filters" popover. */
interface MoreFilterSelect {
  kind?: 'select'
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
}

/** A multi-select checkbox-list row inside the "More filters" popover (e.g. price bands). */
interface MoreFilterCheckboxGroup {
  kind: 'checkboxGroup'
  label: string
  options: { label: string; value: string }[]
  selected: string[]
  onToggle: (value: string) => void
}

export type MoreFilterField = MoreFilterSelect | MoreFilterCheckboxGroup

interface FilterBarProps {
  searchPlaceholder: string
  filters: FilterDef[]
  /** Controlled search input — omit to keep the previous presentational-only box. */
  searchValue?: string
  onSearchChange?: (value: string) => void
  /** Extra filter rows shown in the "More filters" popover — omit to hide the button entirely. */
  moreFilters?: MoreFilterField[]
  /** Count of active (non-default) extra filters, shown as a badge on the button. */
  moreFiltersActiveCount?: number
  onClearMoreFilters?: () => void
  /** Omit to hide the "Apply filters" action at the bottom of the popover. */
  onApplyFilters?: () => void
  /** Fires each time the popover transitions to open — lets the caller (re)seed pending values, discarding any unapplied edits from the last time it was open. */
  onOpenMoreFilters?: () => void
}

export function FilterBar({
  searchPlaceholder,
  filters,
  searchValue,
  onSearchChange,
  moreFilters,
  moreFiltersActiveCount = 0,
  onClearMoreFilters,
  onApplyFilters,
  onOpenMoreFilters,
}: FilterBarProps) {
  const { t } = useTranslation('common')
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false)

  function handleMoreFiltersOpenChange(open: boolean) {
    setMoreFiltersOpen(open)
    if (open) onOpenMoreFilters?.()
  }
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <label className="bg-surface border-border focus-within:border-primary flex h-9 min-w-0 max-w-[340px] flex-[1_1_220px] items-center gap-2 rounded-[9px] border px-[11px] focus-within:shadow-[0_0_0_3px_var(--color-tint)]">
        <Search className="text-fg-4 size-[15px] shrink-0" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          value={onSearchChange ? (searchValue ?? '') : undefined}
          onChange={onSearchChange ? (e) => onSearchChange(e.target.value) : undefined}
          className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-foreground outline-none"
        />
      </label>

      {filters.map((f) =>
        f.options && f.onChange ? (
          <DropdownMenu key={f.label}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="bg-surface border-border text-fg-2 hover:bg-surface-3 hover:text-foreground flex h-9 shrink-0 items-center gap-2 rounded-[9px] border px-[11px] text-[13px] whitespace-nowrap transition-colors"
              >
                <span className="text-fg-4">{f.label}</span>
                <span className="font-semibold">{f.value}</span>
                <ChevronDown className="text-fg-4 size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {f.options.map((opt) => (
                <DropdownMenuItem key={opt.value} onSelect={() => f.onChange?.(opt.value)}>
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            key={f.label}
            type="button"
            className="bg-surface border-border text-fg-2 hover:bg-surface-3 hover:text-foreground flex h-9 shrink-0 items-center gap-2 rounded-[9px] border px-[11px] text-[13px] whitespace-nowrap transition-colors"
          >
            <span className="text-fg-4">{f.label}</span>
            <span className="font-semibold">{f.value}</span>
            <ChevronDown className="text-fg-4 size-3.5" />
          </button>
        ),
      )}

      <div className="flex-1" />

      {moreFilters && moreFilters.length > 0 && (
        <Popover open={moreFiltersOpen} onOpenChange={handleMoreFiltersOpenChange}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex h-9 shrink-0 items-center gap-[7px] rounded-[9px] border px-[11px] text-[12.5px] font-semibold whitespace-nowrap transition-colors',
                moreFiltersActiveCount > 0
                  ? 'bg-tint border-primary text-primary'
                  : 'text-fg-3 hover:text-foreground hover:border-fg-4 border-dashed border-[var(--color-border-strong)]',
              )}
            >
              <SlidersHorizontal className="size-3.5" />
              <span>{t('filters.more')}</span>
              {moreFiltersActiveCount > 0 && (
                <span className="bg-primary flex size-[16px] items-center justify-center rounded-full text-[10px] font-bold text-white">
                  {moreFiltersActiveCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="flex w-80 flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold">{t('filters.more')}</span>
              {moreFiltersActiveCount > 0 && onClearMoreFilters && (
                <button
                  type="button"
                  onClick={onClearMoreFilters}
                  className="text-fg-4 hover:text-foreground flex items-center gap-1 text-[11.5px] font-medium transition-colors"
                >
                  <X className="size-3" />
                  {t('actions.clear')}
                </button>
              )}
            </div>
            {moreFilters.map((f) =>
              f.kind === 'checkboxGroup' ? (
                <div key={f.label} className="flex flex-col gap-2">
                  <span className="text-fg-3 text-[11.5px] font-semibold">{f.label}</span>
                  <div className="flex flex-col gap-2">
                    {f.options.map((opt) => (
                      <label key={opt.value} className="flex cursor-pointer items-center gap-2.5">
                        <Checkbox checked={f.selected.includes(opt.value)} onCheckedChange={() => f.onToggle(opt.value)} />
                        <span className="text-[13px]">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div key={f.label} className="flex flex-col gap-1.5">
                  <span className="text-fg-3 text-[11.5px] font-semibold">{f.label}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="bg-surface border-border text-fg-2 hover:bg-surface-3 hover:text-foreground flex h-9 w-full items-center justify-between gap-2 rounded-[9px] border px-[11px] text-[13px] transition-colors"
                      >
                        <span className="font-semibold">{f.value}</span>
                        <ChevronDown className="text-fg-4 size-3.5 shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                      {f.options.map((opt) => (
                        <DropdownMenuItem key={opt.value} onSelect={() => f.onChange(opt.value)}>
                          {opt.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ),
            )}
            {onApplyFilters && (
              <button
                type="button"
                onClick={() => {
                  onApplyFilters()
                  setMoreFiltersOpen(false)
                }}
                className="bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover mt-1 flex h-9 w-full items-center justify-center gap-[7px] rounded-[9px] text-[12.5px] font-semibold transition-colors"
              >
                <Check className="size-3.5" />
                {t('filters.apply')}
              </button>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
