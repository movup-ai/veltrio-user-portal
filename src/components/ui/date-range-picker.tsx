import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/** Both ends are `YYYY-MM-DD`; an empty string means "open on that side". */
export interface DateRange {
  from: string
  to: string
}

export const EMPTY_DATE_RANGE: DateRange = { from: '', to: '' }

export interface DateRangePickerProps {
  value: DateRange
  onChange: (value: DateRange) => void
  /** The element that opens the calendar — rendered via `asChild`, so it keeps its own styling. */
  trigger: React.ReactNode
  /** Months shown side by side. Two makes picking a span that crosses a month boundary one gesture. */
  numberOfMonths?: number
  align?: 'start' | 'center' | 'end'
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Local-time both ways — `new Date('2026-09-18')` parses as UTC and can shift the day. */
export function toDateValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function fromDateValue(value: string): Date | undefined {
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return undefined
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/**
 * Day-to-day range selection in a popover. The first click lands a one-day range and the next
 * extends it, so the calendar stays open until Done — auto-closing on the first click would
 * make a span impossible to draw.
 *
 * Edits are held as a draft and only committed on Done, matching the "More filters" popover.
 * Applying live would filter the list against a half-drawn range on the way to the real one,
 * and dismissing without Done would leave that midpoint applied.
 */
export function DateRangePicker({ value, onChange, trigger, numberOfMonths = 2, align = 'start' }: DateRangePickerProps) {
  const { t } = useTranslation('common')
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState(value)

  const from = fromDateValue(draft.from)
  const to = fromDateValue(draft.to)
  const selected = from ? { from, to } : undefined

  // A one-day range is both ends at once; flattening its corners would make it look like a chip.
  const isSpan = Boolean(draft.from && draft.to && draft.from !== draft.to)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    // Reseeding on open discards edits abandoned by clicking away or pressing Escape.
    if (next) setDraft(value)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-2">
        <Calendar
          mode="range"
          autoFocus
          numberOfMonths={numberOfMonths}
          selected={selected}
          defaultMonth={from}
          classNames={{
            months: 'relative flex flex-col gap-4 sm:flex-row sm:gap-5',
            // Range days are styled by position instead, so the blanket "selected" fill is dropped.
            selected: '',
            range_start: `[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:font-semibold ${isSpan ? '[&>button]:rounded-r-none' : ''}`,
            range_middle: '[&>button]:bg-tint [&>button]:text-primary [&>button]:rounded-none',
            range_end: `[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:font-semibold ${isSpan ? '[&>button]:rounded-l-none' : ''}`,
          }}
          onSelect={(range) => {
            setDraft({ from: range?.from ? toDateValue(range.from) : '', to: range?.to ? toDateValue(range.to) : '' })
          }}
        />
        <div className="border-border-soft mt-2 flex items-center justify-between gap-2 border-t pt-2">
          {/* Clear takes effect at once — there's nothing left to confirm once the range is gone. */}
          <button
            type="button"
            onClick={() => {
              setDraft(EMPTY_DATE_RANGE)
              onChange(EMPTY_DATE_RANGE)
              setOpen(false)
            }}
            className="text-fg-3 hover:bg-surface-3 hover:text-foreground rounded-[7px] px-2 py-1 text-[12.5px] font-semibold transition-colors"
          >
            {t('actions.clear')}
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(draft)
              setOpen(false)
            }}
            className="bg-primary text-primary-foreground hover:bg-primary-hover rounded-[7px] px-3 py-1 text-[12.5px] font-semibold transition-colors"
          >
            {t('actions.done')}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
