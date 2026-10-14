import { CarFront } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useMatches } from 'react-router-dom'
import { LanguageSwitcher } from '@/components/navigation/LanguageSwitcher'
import { useMediaQuery } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'
import type { AuthRouteHandle } from './onboarding-steps'
import { StepProgress } from './OnboardingSteps'

// Its own chunk: the carousel is only wanted where the brand panel is on screen.
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
  // Sign-up and onboarding name their step; sign-in names none.
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

        {wide && (
          <Suspense fallback={<div className="flex-1" />}>
            <AuthShowcase step={step} />
          </Suspense>
        )}
      </aside>

      <main className="flex min-h-screen flex-col px-4 py-5 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between gap-4">
          {/* The panel carries the brand on wide screens; kept invisible so the switcher stays put. */}
          <Brand className="lg:invisible" />
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 flex-col items-center py-10 sm:justify-center">
          {/* Not over sign-up itself: the steps mean something once there is an account to continue. */}
          {step && step !== 'account' && <StepProgress current={step} className="mb-10 w-full max-w-md" />}
          <div className="flex w-full justify-center">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
