import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StepDef {
  key: string
  label: string
}

interface StepperProps {
  steps: StepDef[]
  currentIndex: number
  /** Steps the user has already visited/completed — lets them jump back. */
  furthestIndex: number
  onStepClick?: (index: number) => void
  /** Accessible name for the step list — pass a translated string. */
  ariaLabel: string
  className?: string
}

export function Stepper({ steps, currentIndex, furthestIndex, onStepClick, ariaLabel, className }: StepperProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1.5', className)} role="tablist" aria-label={ariaLabel}>
      {steps.map((step, i) => {
        const state = i < currentIndex ? 'complete' : i === currentIndex ? 'current' : 'upcoming'
        const clickable = Boolean(onStepClick) && i <= furthestIndex

        return (
          <div key={step.key} className="flex items-center gap-2">
            <button
              type="button"
              role="tab"
              aria-selected={state === 'current'}
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(i)}
              className={cn(
                'flex items-center gap-1.5 rounded-[7px] px-2 py-1 text-[13px] font-semibold whitespace-nowrap transition-colors',
                clickable && 'cursor-pointer hover:bg-surface-2',
                !clickable && 'cursor-default',
                state === 'current' && 'text-foreground',
                state === 'complete' && 'text-fg-2',
                state === 'upcoming' && 'text-fg-4',
              )}
            >
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                  state === 'current' && 'bg-primary text-primary-foreground',
                  state === 'complete' && 'bg-tint text-primary',
                  state === 'upcoming' && 'bg-surface-3 text-fg-4',
                )}
              >
                {state === 'complete' ? <Check className="size-3" /> : i + 1}
              </span>
              {step.label}
            </button>
            {i < steps.length - 1 && <ChevronRight className="text-fg-4 size-3.5 shrink-0" />}
          </div>
        )
      })}
    </div>
  )
}
