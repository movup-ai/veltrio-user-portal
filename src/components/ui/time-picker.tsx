import * as React from 'react'
import { Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useFormatters } from '@/i18n'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export interface TimePickerProps {
  /** `HH:mm` in 24h, the same shape a native time input produces. */
  value: string
  onChange: (value: string) => void
  /** Minutes between slots. 30 gives 12:00 AM, 12:30 AM, 1:00 AM … */
  minuteStep?: number
  invalid?: boolean
  disabled?: boolean
  id?: string
  'aria-label'?: string
  className?: string
}

const MINUTES_PER_DAY = 24 * 60

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toValue(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

/** Minutes since midnight, falling back to 09:00 so the list always has something highlighted. */
function toMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return 9 * 60
  return h * 60 + m
}

/**
 * Single scrolling list of time slots, replacing the native time input. Holds a 24h `HH:mm`
 * value while displaying whatever the active locale uses, so the form and the API never see
 * an AM/PM string.
 */
export function TimePicker({
  value,
  onChange,
  minuteStep = 30,
  invalid,
  disabled,
  id,
  className,
  ...aria
}: TimePickerProps) {
  const { t } = useTranslation('common')
  const format = useFormatters()
  const [open, setOpen] = React.useState(false)

  const selected = toMinutes(value)

  const slots = React.useMemo(() => {
    const generated = Array.from({ length: Math.ceil(MINUTES_PER_DAY / minuteStep) }, (_, i) => i * minuteStep)
    // A value off the step grid (a restored draft, say) still deserves a row to highlight.
    return generated.includes(selected) ? generated : [...generated, selected].sort((a, b) => a - b)
  }, [minuteStep, selected])

  const label = React.useCallback(
    (minutes: number) =>
      format.date(new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60), { hour: 'numeric', minute: '2-digit' }),
    [format],
  )

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
          <span className="flex-1 text-left tabular-nums">{label(selected)}</span>
          <Clock className="text-fg-4 size-4 shrink-0" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-36 p-1">
        <TimeList slots={slots} selected={selected} label={label} ariaLabel={t('time.select')} onSelect={(m) => {
          onChange(toValue(m))
          setOpen(false)
        }} />
      </PopoverContent>
    </Popover>
  )
}

function TimeList({
  slots,
  selected,
  label,
  ariaLabel,
  onSelect,
}: {
  slots: number[]
  selected: number
  label: (minutes: number) => string
  ariaLabel: string
  onSelect: (minutes: number) => void
}) {
  const activeRef = React.useRef<HTMLButtonElement>(null)

  // Jump the current slot into view on open, so a 5:30 PM booking doesn't start at midnight.
  React.useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  return (
    <div role="listbox" aria-label={ariaLabel} className="vx-scroll max-h-60 overflow-y-auto">
      {slots.map((minutes) => {
        const isSelected = minutes === selected
        return (
          <button
            key={minutes}
            ref={isSelected ? activeRef : undefined}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(minutes)}
            className={cn(
              'block w-full rounded-sm px-2.5 py-1.5 text-left text-[13px] tabular-nums transition-colors',
              isSelected ? 'bg-primary text-primary-foreground font-semibold' : 'text-fg-2 hover:bg-muted hover:text-foreground',
            )}
          >
            {label(minutes)}
          </button>
        )
      })}
    </div>
  )
}
