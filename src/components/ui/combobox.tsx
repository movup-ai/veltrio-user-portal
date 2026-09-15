import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  emptyText?: string
  invalid?: boolean
  disabled?: boolean
  'aria-label'?: string
  id?: string
  className?: string
}

/**
 * Searchable select that also accepts free text not present in `options`
 * (e.g. a make/model/color the fleet doesn't already have on file).
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  emptyText = 'No matches — press Enter to use this value',
  invalid,
  disabled,
  className,
  id,
  ...aria
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState(value)
  // Separate from `query` so reopening a field that already has a value shows the full list
  // (browsing) instead of immediately filtering down to just the current value (searching).
  const [filterText, setFilterText] = React.useState('')
  const [highlighted, setHighlighted] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  const filtered = React.useMemo(() => {
    const q = filterText.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.toLowerCase().includes(q))
  }, [options, filterText])

  const commit = (next: string) => {
    onChange(next)
    setQuery(next)
    setFilterText('')
    setOpen(false)
  }

  const handleOpen = () => {
    if (disabled) return
    setOpen(true)
    setQuery(value)
    setFilterText('')
    setHighlighted(0)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          if (query.trim() && query !== value) commit(query.trim())
          else {
            setQuery(value)
            setFilterText('')
          }
        }
      }}
    >
      <PopoverAnchor asChild>
        <div
          className={cn(
            'flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-1 text-body shadow-xs transition-colors',
            'focus-within:outline-ring focus-within:outline-2 focus-within:outline-offset-2',
            disabled && 'cursor-not-allowed opacity-50',
            invalid && 'border-error focus-within:outline-error',
            className,
          )}
        >
          <input
            ref={inputRef}
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid || undefined}
            autoComplete="off"
            disabled={disabled}
            placeholder={placeholder}
            className="w-full min-w-0 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            value={open ? query : value}
            onFocus={handleOpen}
            onClick={handleOpen}
            onChange={(e) => {
              setQuery(e.target.value)
              setFilterText(e.target.value)
              if (!open) setOpen(true)
              setHighlighted(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                if (!open) return handleOpen()
                setHighlighted((h) => Math.min(h + 1, filtered.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setHighlighted((h) => Math.max(h - 1, 0))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                const pick = filtered[highlighted] ?? query.trim()
                if (pick) commit(pick)
              } else if (e.key === 'Escape') {
                setQuery(value)
                setFilterText('')
                setOpen(false)
              }
            }}
            {...aria}
          />
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div ref={listRef} className="max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-fg-4 px-2 py-2 text-[12.5px]">{emptyText}</p>
          ) : (
            filtered.map((option, index) => (
              <button
                key={option}
                type="button"
                className={cn(
                  'relative flex w-full cursor-pointer items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-left text-body outline-none transition-colors',
                  index === highlighted && 'bg-muted',
                )}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => commit(option)}
              >
                <span className="absolute left-2 flex size-3.5 items-center justify-center">
                  {option === value && <Check className="size-4" />}
                </span>
                {option}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
