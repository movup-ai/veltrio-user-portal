import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ONBOARDING_PATHS, ONBOARDING_STEPS, type OnboardingStep } from './onboarding-steps'

type StepState = 'done' | 'current' | 'upcoming'

function stateOf(step: number, current: number): StepState {
  if (step < current) return 'done'
  return step === current ? 'current' : 'upcoming'
}

/**
 * The four steps across the top of the form, joined by a line that fills as they are done. A done
 * step links back to its page; the account has none to go back to once it exists.
 */
export function StepProgress({ current, className }: { current: OnboardingStep; className?: string }) {
  const { t } = useTranslation('auth')
  const at = ONBOARDING_STEPS.indexOf(current)

  return (
    <nav aria-label={t('steps.label')} className={className}>
      <ol className="m-0 flex list-none items-start p-0">
        {ONBOARDING_STEPS.map((step, i) => {
          const state = stateOf(i, at)
          return (
            <li
              key={step}
              aria-current={state === 'current' ? 'step' : undefined}
              className="relative flex flex-1 flex-col items-center gap-2 text-center"
            >
              {/* From the step before to this one, stopping short of both circles. */}
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-[15px] right-[calc(50%+22px)] h-0.5 w-[calc(100%-44px)] rounded-full',
                    i <= at ? 'bg-primary' : 'bg-border-strong/60',
                  )}
                />
              )}
              <Marker to={state === 'done' && step !== 'account' ? ONBOARDING_PATHS[step] : undefined}>
                <span
                  className={cn(
                    // Above the lines: each is drawn by the step after it, so it would paint over this one.
                    'relative z-10 flex size-8 items-center justify-center rounded-full font-[family-name:var(--font-display)] text-[13px] font-bold transition-colors',
                    state === 'done' && 'bg-tint text-primary',
                    state === 'current' && 'bg-primary text-primary-foreground ring-primary/15 ring-[5px]',
                    state === 'upcoming' && 'bg-surface text-fg-4 ring-border-strong ring-1 ring-inset',
                  )}
                >
                  {state === 'done' ? <Check className="size-4" strokeWidth={3} aria-hidden /> : i + 1}
                </span>
                <span
                  className={cn(
                    'text-[13px]',
                    state === 'current'
                      ? 'text-foreground font-semibold'
                      : state === 'done'
                        ? 'text-fg-2 font-medium'
                        : 'text-fg-4 font-medium',
                  )}
                >
                  {t(`steps.${step}`)}
                  {state === 'done' && <span className="sr-only"> ({t('steps.done')})</span>}
                </span>
              </Marker>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function Marker({ to, children }: { to?: string; children: ReactNode }) {
  const className = 'flex flex-col items-center gap-2'
  if (!to) return <div className={className}>{children}</div>
  return (
    <Link
      to={to}
      className={cn(
        className,
        'rounded-md hover:[&>span:first-child]:bg-primary/20 hover:[&>span:last-child]:text-primary',
      )}
    >
      {children}
    </Link>
  )
}
