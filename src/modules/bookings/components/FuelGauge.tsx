import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { FUEL_LEVELS, type FuelLevel } from '../types/booking.types'

interface FuelGaugeProps {
  id: string
  label: string
  value?: FuelLevel
  onChange: (level: FuelLevel) => void
  invalid?: boolean
  'aria-describedby'?: string
}

/**
 * The fuel or charge level, picked off a gauge from Empty to Full in eighths: one tap, and it
 * fills to the level the way the dashboard's does. Radios underneath, so arrow keys move it.
 */
export function FuelGauge({ id, label, value, onChange, invalid, ...field }: FuelGaugeProps) {
  const { t } = useTranslation('bookings')
  const name = useId()

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={label}
      aria-invalid={invalid || undefined}
      className={cn(
        'border-input flex overflow-hidden rounded-md border shadow-xs',
        invalid && 'border-error',
      )}
      {...field}
    >
      {FUEL_LEVELS.map((level) => (
        <label key={level} className="min-w-0 flex-1 cursor-pointer">
          <input
            type="radio"
            name={name}
            className="peer sr-only"
            checked={value === level}
            onChange={() => onChange(level)}
          />
          <span
            className={cn(
              'peer-focus-visible:ring-ring flex h-9 items-center justify-center text-[12px] tabular-nums transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-inset',
              level > 0 && 'border-border border-l',
              value === level
                ? 'bg-primary text-primary-foreground border-primary font-semibold'
                : value !== undefined && level < value
                  ? 'bg-tint text-fg-2'
                  : // The eighths between the quarters sit back, as the short ticks on a gauge do.
                    cn('hover:bg-surface-2', level % 2 === 0 ? 'text-fg-2' : 'text-fg-4'),
            )}
          >
            {t(`details.condition.fuelLevels.${level}`)}
          </span>
        </label>
      ))}
    </div>
  )
}
