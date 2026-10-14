import useEmblaCarousel from 'embla-carousel-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { ONBOARDING_STEPS, type OnboardingStep } from './onboarding-steps'

// Real screens with demo data, captured by tools/auth-showcase; rerun it when a screen changes.
const IMAGES = import.meta.glob<string>('../../assets/auth-showcase/*.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
})

/**
 * Each step shows what it leads to. The close-ups differ in shape (two wide strips, a card, a tall
 * panel), so each is placed for its own, relative to the screen it enlarges.
 */
const SCENES: Record<OnboardingStep, { name: string; detail: string }> = {
  account: { name: 'dashboard', detail: '-bottom-[9%] left-[5%] w-[90%]' },
  company: { name: 'site', detail: 'right-[3%] -bottom-[10%] w-[32%]' },
  plan: { name: 'calendar', detail: '-bottom-[11%] left-[5%] w-[90%]' },
  ready: { name: 'booking', detail: 'top-[8%] right-[2%] h-[90%] w-auto' },
}

const ADVANCE_MS = 6000

// English stands in where a screen has no Spanish capture: the renter's site is not translated.
function image(name: string, language: string): string | undefined {
  const path = (lang: string) => `../../assets/auth-showcase/${name}-${lang}.jpg`
  return IMAGES[path(language)] ?? IMAGES[path('en')]
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function Scene({ step, language, current }: { step: OnboardingStep; language: string; current: boolean }) {
  const { t } = useTranslation('auth')
  const { name, detail: placement } = SCENES[step]
  const main = image(name, language)
  const detail = image(`${name}-detail`, language)

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-hidden={!current}
      className="flex h-full min-w-0 shrink-0 grow-0 basis-full flex-col gap-10 px-12 xl:px-14"
    >
      {/* Decorative: the headline below says the same in words. */}
      <div className="relative flex min-h-0 flex-1 items-center [container-type:size]">
        {/* The largest 16:10 frame the space allows across and down, short of room for the close-up
            to hang below; the close-up is then placed against the frame, not the panel. */}
        <div className="relative aspect-[16/10] w-[min(100cqw,calc(84cqh*1.6))]">
          {main && (
            <img
              src={main}
              alt=""
              // Lazy throughout: the slide in view still loads at once, and on a phone, where the
              // panel is hidden, none of them download at all.
              loading="lazy"
              decoding="async"
              className="ring-solid-foreground/10 size-full rounded-xl shadow-[0_40px_80px_-30px_rgb(0_0_0/0.65)] ring-1"
            />
          )}
          {detail && (
            <img
              src={detail}
              alt=""
              loading="lazy"
              decoding="async"
              className={cn(
                'absolute max-w-none rounded-lg shadow-[0_28px_56px_-18px_rgb(0_0_0/0.6)] ring-1 ring-black/5',
                placement,
              )}
            />
          )}
        </div>
      </div>

      <div className="max-w-[30rem]">
        <p className="font-[family-name:var(--font-display)] text-[34px] leading-[1.1] font-bold tracking-[-0.02em] text-balance">
          {t(`showcase.${step}.title`)}
        </p>
        <p className="text-solid-foreground/70 mt-3.5 max-w-[26rem] text-[15px] leading-relaxed">
          {t(`showcase.${step}.body`)}
        </p>
      </div>
    </div>
  )
}

/**
 * The brand panel on every auth page: a slider of what Veltrio does, opening on the screen the
 * current step leads to, or the first on sign-in. It moves on by itself unless the reader is
 * pointing at it or asks for less motion.
 */
export function AuthShowcase({ step }: { step?: OnboardingStep }) {
  const { t, i18n } = useTranslation('auth')
  const language = i18n.resolvedLanguage === 'es' ? 'es' : 'en'
  const stepIndex = step ? ONBOARDING_STEPS.indexOf(step) : 0
  const [viewportRef, api] = useEmblaCarousel({ loop: true, startIndex: stepIndex, duration: 32 })
  const [selected, setSelected] = useState(stepIndex)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (!api) return
    const onSelect = () => setSelected(api.selectedScrollSnap())
    api.on('select', onSelect)
    return () => {
      api.off('select', onSelect)
    }
  }, [api])

  // A new step brings its own screen forward, wherever the slider had got to.
  useEffect(() => {
    api?.scrollTo(stepIndex)
  }, [api, stepIndex])

  // Restarted on every change of slide, so a dot clicked a moment ago is not cut short.
  useEffect(() => {
    if (!api || paused || prefersReducedMotion()) return
    const timer = window.setTimeout(() => api.scrollNext(), ADVANCE_MS)
    return () => window.clearTimeout(timer)
  }, [api, paused, selected])

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t('showcase.label')}
      className="flex min-h-0 flex-1 flex-col gap-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Out to the panel's own edges, so a slide travels the full width rather than a window in it. */}
      <div ref={viewportRef} className="-mx-12 min-h-0 flex-1 overflow-hidden xl:-mx-14">
        <div className="flex h-full">
          {ONBOARDING_STEPS.map((scene, i) => (
            <Scene key={scene} step={scene} language={language} current={i === selected} />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {ONBOARDING_STEPS.map((scene, i) => (
          <button
            key={scene}
            type="button"
            aria-label={t('showcase.goTo', { title: t(`showcase.${scene}.title`) })}
            aria-current={i === selected || undefined}
            onClick={() => api?.scrollTo(i)}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              i === selected
                ? 'bg-solid-foreground w-7'
                : 'bg-solid-foreground/30 hover:bg-solid-foreground/55 w-2',
            )}
          />
        ))}
      </div>
    </section>
  )
}
