import { CarFront } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Outlet, useMatches } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/navigation/LanguageSwitcher'
import { useMediaQuery } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'
import { FleetBoard } from './FleetBoard'
import type { AuthRouteHandle } from './onboarding-steps'
import { StepProgress } from './OnboardingSteps'

// Only sign-up and onboarding show it; sign-in, the page opened most, is spared the carousel.
const AuthShowcase = lazy(() => import('./AuthShowcase').then((m) => ({ default: m.AuthShowcase })))

function Brand({ className, onSolid = false }: { className?: string; onSolid?: boolean }) {
  const { t } = useTranslation('common')
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg',
          onSolid ? 'bg-solid-foreground/15 ring-1 ring-solid-foreground/20' : 'bg-primary',
        )}
      >
        <CarFront
          className={cn('size-[18px]', onSolid ? 'text-solid-foreground' : 'text-primary-foreground')}
          strokeWidth={2.25}
        />
      </div>
      <span className="font-[family-name:var(--font-display)] text-[17px] font-bold tracking-tight">
        {t('brand')}
      </span>
    </div>
  )
}

export function AuthLayout() {
  const { t } = useTranslation('auth')
  // Sign-up and onboarding name their step; sign-in names none and keeps the fleet board.
  const step = useMatches()
    .map((match) => (match.handle as AuthRouteHandle | undefined)?.step)
    .find(Boolean)
  // The panel is CSS-hidden below `lg`; not rendering it there spares phones the slider's code and timer.
  const wide = useMediaQuery('(min-width: 64rem)')

  return (
    <div
      className={cn(
        'grid min-h-screen bg-surface',
        'lg:grid-cols-[minmax(460px,5fr)_7fr]',
        // Only from the width where it buys four plan cards a row; below it they sit two by two anyway.
        step === 'plan' && 'min-[1680px]:grid-cols-[minmax(420px,4fr)_8fr]',
      )}
    >
      <aside className="hidden overflow-hidden bg-brand-deep text-solid-foreground lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:gap-10 lg:p-12 xl:p-14 [@media(max-height:780px)]:gap-6 [@media(max-height:780px)]:py-8">
        <Brand onSolid />

        {!wide ? null : step ? (
          <Suspense fallback={<div className="flex-1" />}>
            <AuthShowcase step={step} />
          </Suspense>
        ) : (
          <>
            {/* Below this height the board would crowd the headline, which carries the same message. */}
            <div className="flex flex-1 items-center [@media(max-height:600px)]:hidden">
              <FleetBoard className="w-full max-w-[580px]" />
            </div>
            <div className="mt-auto max-w-[30rem]">
              <p className="font-[family-name:var(--font-display)] text-[38px] leading-[1.08] font-bold tracking-[-0.02em] text-balance">
                {t('brandPanel.headline')}
              </p>
              <p className="mt-4 max-w-[26rem] text-[15px] leading-relaxed text-solid-foreground/70">
                {t('brandPanel.subtitle')}
              </p>
            </div>
          </>
        )}
      </aside>

      <main className="flex min-h-screen flex-col px-4 py-5 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between gap-4">
          {/* The panel carries the brand on wide screens; kept invisible so the switcher stays put. */}
          <Brand className="lg:invisible" />
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 flex-col items-center py-10 sm:justify-center">
          {step && <StepProgress current={step} className="mb-10 w-full max-w-md" />}
          <div className="flex w-full justify-center">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
