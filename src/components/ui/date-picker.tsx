import * as React from 'react'
import { CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useFormatters } from '@/i18n'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

export interface DatePickerProps {
  /** `YYYY-MM-DD`, the same shape a native date input produces. */
  value: string
  onChange: (value: string) => void
  /** Days before this date are struck through and unselectable. Also `YYYY-MM-DD`. */
  min?: string
  /** Days after this date are struck through and unselectable. Also `YYYY-MM-DD`. */
  max?: string
  /**
   * Swaps the month label for month/year dropdowns, bounded by `fromYear`/`toYear`. Worth it
   * for dates far from today (a date of birth) where paging month by month is unusable.
   */
  yearRange?: { from: number; to: number }
  placeholder?: string
  invalid?: boolean
  disabled?: boolean
  id?: string
  'aria-label'?: string
  className?: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Local-time conversion both ways — `new Date('2026-09-18')` would parse as UTC and shift the day. */
function toValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function fromValue(value: string): Date | undefined {
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return undefined
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/** Calendar-in-a-popover, replacing the native date input and its browser-styled picker. */
export function DatePicker({
  value,
  onChange,
  min,
  max,
  yearRange,
  placeholder,
  invalid,
  disabled,
  id,
  className,
  ...aria
}: DatePickerProps) {
  const { t } = useTranslation('common')
  const format = useFormatters()
  const [open, setOpen] = React.useState(false)

  const selected = fromValue(value)
  const minDate = min ? fromValue(min) : undefined
  const maxDate = max ? fromValue(max) : undefined

  const disabledDays = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={cn(
            'border-input bg-background text-body shadow-xs flex h-9 w-full items-center gap-2 rounded-md border px-3 py-1 transition-colors',
            'focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'aria-[invalid=true]:border-error aria-[invalid=true]:focus-visible:outline-error',
            className,
          )}
          {...aria}
        >
          <span className={cn('flex-1 text-left', !selected && 'text-muted-foreground')}>
            {selected ? format.date(selected, { dateStyle: 'medium' }) : (placeholder ?? t('datePlaceholder'))}
          </span>
          <CalendarDays className="text-fg-4 size-4 shrink-0" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <Calendar
          mode="single"
          autoFocus
          selected={selected}
          defaultMonth={selected ?? maxDate}
          disabled={disabledDays.length > 0 ? disabledDays : undefined}
          captionLayout={yearRange ? 'dropdown' : 'label'}
          startMonth={yearRange ? new Date(yearRange.from, 0) : undefined}
          endMonth={yearRange ? new Date(yearRange.to, 11) : undefined}
          onSelect={(date) => {
            if (!date) return
            onChange(toValue(date))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
