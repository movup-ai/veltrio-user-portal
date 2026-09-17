import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import type { StepDef } from './Stepper'

interface StepSidebarProps {
  steps: StepDef[]
  currentIndex: number
  /** Steps the user has already reached — lets them jump back without skipping ahead. */
  furthestIndex: number
  onStepClick?: (index: number) => void
  /** Accessible name for the step list — pass a translated string. */
  ariaLabel: string
  className?: string
}

/**
 * Vertical, labelled step list for long multi-step forms — the counterpart to the compact
 * horizontal Stepper. Each step carries a description, so the sidebar doubles as a summary
 * of what the form will ask for.
 */
export function StepSidebar({ steps, currentIndex, furthestIndex, onStepClick, ariaLabel, className }: StepSidebarProps) {
  return (
    <Card as="section" className={cn('p-2', className)}>
      <div className="flex flex-col gap-0.5" role="tablist" aria-orientation="vertical" aria-label={ariaLabel}>
        {steps.map((step, i) => {
          const state = i < currentIndex ? 'complete' : i === currentIndex ? 'current' : 'upcoming'
          const clickable = Boolean(onStepClick) && i <= furthestIndex

          return (
            <button
              key={step.key}
              type="button"
              role="tab"
              aria-selected={state === 'current'}
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(i)}
              className={cn(
                'flex w-full items-start gap-2.5 rounded-[9px] px-2.5 py-2 text-left transition-colors',
                state === 'current' && 'bg-tint',
                state !== 'current' && clickable && 'hover:bg-surface-2 cursor-pointer',
                !clickable && 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'mt-px flex size-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                  state === 'current' && 'bg-primary text-primary-foreground',
                  state === 'complete' && 'bg-tint text-primary',
                  state === 'upcoming' && 'bg-surface-3 text-fg-4',
                )}
              >
                {state === 'complete' ? <Check className="size-3" aria-hidden /> : i + 1}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    'block text-[14px] font-semibold',
                    state === 'current' && 'text-foreground',
                    state === 'complete' && 'text-fg-2',
                    state === 'upcoming' && 'text-fg-3',
                  )}
                >
                  {step.label}
                </span>
                {step.description && <span className="text-fg-4 block text-[12.5px]">{step.description}</span>}
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
