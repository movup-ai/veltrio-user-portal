import useEmblaCarousel from 'embla-carousel-react'
import { Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMediaQuery } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'
import { SITE_DOMAIN } from '@/modules/vehicles/utils/public-links'
import { useSitePreviewStore } from '@/state/site-preview.store'
import { ONBOARDING_STEPS, type OnboardingStep } from './onboarding-steps'

// Real screens with demo data, captured by tools/auth-showcase; rerun it when a screen changes.
const IMAGES = import.meta.glob<string>('../../assets/auth-showcase/*.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
})

const ADVANCE_MS = 6500
// The demo company's own address, on the slide that is not the reader's site.
const DEMO_SUBDOMAIN = 'sunstate-car-co'

interface Scene {
  main: string
  /** The renter's site sits in a browser window; the portal's screens need no frame. */
  frame: 'app' | 'browser'
  /** Close-ups over the main screen. They differ in shape, so each is placed for its own. */
  details: Detail[]
}

interface Detail {
  name: string
  className: string
  /** Sized by its height, as a tall panel is; the rest by their width. */
  tall?: boolean
  /** Names it on a step's scene, where several close-ups would otherwise read as one picture. */
  label?: DetailLabel
}

type DetailLabel = 'fleetCard' | 'bookWithDates' | 'renterChecks' | 'fleetCalendar'

const SLIDES = {
  dashboard: {
    main: 'dashboard',
    frame: 'app',
    details: [{ name: 'dashboard-detail', className: '-bottom-[9%] left-[5%] w-[90%]' }],
  },
  site: {
    main: 'site',
    frame: 'browser',
    details: [{ name: 'site-detail', className: 'right-[3%] -bottom-[10%] w-[32%]' }],
  },
  calendar: {
    main: 'calendar',
    frame: 'app',
    details: [{ name: 'calendar-detail', className: '-bottom-[11%] left-[5%] w-[90%]' }],
  },
  booking: {
    main: 'booking',
    frame: 'app',
    details: [{ name: 'booking-detail', className: 'top-[8%] right-[2%] h-[90%]', tall: true }],
  },
} satisfies Record<string, Scene>
type Slide = keyof typeof SLIDES
const SLIDE_KEYS = Object.keys(SLIDES) as Slide[]

type Step = Exclude<OnboardingStep, 'account'>

/** Each step shows what it leads to, all at once: someone filling in a form should not watch slides. */
const STEP_SCENES: Record<Step, Scene> = {
  company: {
    main: 'site',
    frame: 'browser',
    details: [
      { name: 'site-detail', className: '-bottom-[16%] -left-[5%] w-[27%]', label: 'fleetCard' },
      {
        name: 'vehicle-detail',
        className: '-right-[6%] top-[24%] h-[84%]',
        tall: true,
        label: 'bookWithDates',
      },
    ],
  },
  plan: {
    main: 'vehicles',
    frame: 'app',
    details: [
      { name: 'booking-checks', className: '-top-[9%] -right-[6%] w-[58%]', label: 'renterChecks' },
      { name: 'calendar-detail', className: '-bottom-[18%] -left-[5%] w-[80%]', label: 'fleetCalendar' },
    ],
  },
  ready: {
    main: 'booking',
    frame: 'app',
    details: [
      { name: 'pay-detail', className: '-top-[6%] -right-[6%] w-[34%]' },
      { name: 'sign-detail', className: '-bottom-[17%] -left-[5%] w-[44%]' },
    ],
  },
}

// English stands in where a screen has no Spanish capture: the renter's site is not translated.
function image(name: string, language: string): string | undefined {
  const path = (lang: string) => `../../assets/auth-showcase/${name}-${lang}.jpg`
  return IMAGES[path(language)] ?? IMAGES[path('en')]
}

/** Starts the next step's images early, so its scene does not open on empty frames. */
function preload(scene: Scene, language: string) {
  for (const name of [scene.main, ...scene.details.map((detail) => detail.name)]) {
    const src = image(name, language)
    if (src) new Image().src = src
  }
}

function BrowserBar({ url }: { url: string }) {
  return (
    <div className="flex h-7 shrink-0 items-center gap-3 border-b border-black/5 bg-neutral-100 px-3">
      <div className="flex gap-1.5" aria-hidden>
        {[0, 1, 2].map((dot) => (
          <span key={dot} className="size-2 rounded-full bg-neutral-300" />
        ))}
      </div>
      <div className="mx-auto flex h-[18px] max-w-[60%] min-w-0 items-center gap-1 rounded-md bg-white px-2.5 text-[10.5px] text-neutral-600">
        <Lock aria-hidden className="size-2.5 shrink-0" />
        <span className="truncate" data-testid="showcase-url">
          {url}
        </span>
      </div>
      <div className="w-[34px]" />
    </div>
  )
}

const STAGGER_MS = 220

function SceneView({
  scene,
  title,
  body,
  url,
  language,
  staged = false,
}: {
  scene: Scene
  title: string
  body: string
  url?: string
  language: string
  /** Brings the close-ups in one after another, so a step's scene shows it has several parts. */
  staged?: boolean
}) {
  const { t } = useTranslation('auth')
  const main = image(scene.main, language)

  return (
    <div className="flex h-full min-w-0 flex-col gap-10 px-12 xl:px-14">
      {/* Decorative: the headline below says the same in words. */}
      <div className="relative flex min-h-0 flex-1 items-center [container-type:size]">
        {/* The largest 16:10 frame the space allows across and down, short of room for the close-ups
            to hang outside it; they are then placed against the frame, not the panel. */}
        <div className="relative aspect-[16/10] w-[min(100cqw,calc(84cqh*1.6))]">
          <div className="ring-solid-foreground/10 flex size-full flex-col overflow-hidden rounded-xl bg-white shadow-[0_40px_80px_-30px_rgb(0_0_0/0.65)] ring-1">
            {scene.frame === 'browser' && <BrowserBar url={url ?? ''} />}
            {main && (
              <img
                src={main}
                alt=""
                // Lazy throughout: the scene in view still loads at once, and on a phone, where the
                // panel is hidden, none of them download at all.
                loading="lazy"
                decoding="async"
                className="min-h-0 w-full flex-1 object-cover object-top"
              />
            )}
          </div>
          {scene.details.map(({ name, className, tall, label }, i) => {
            const src = image(name, language)
            return (
              src && (
                <div
                  key={name}
                  className={cn(
                    'absolute',
                    staged && 'motion-safe:animate-[rise-in_500ms_ease-out_both]',
                    className,
                  )}
                  // After the scene itself has faded in, then each a beat after the one before.
                  style={staged ? { animationDelay: `${250 + i * STAGGER_MS}ms` } : undefined}
                >
                  <img
                    src={src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={cn(
                      'block max-w-none rounded-lg shadow-[0_28px_56px_-18px_rgb(0_0_0/0.6)] ring-1 ring-black/5',
                      tall ? 'h-full w-auto' : 'h-auto w-full',
                    )}
                  />
                  {label && (
                    <span className="bg-brand-deep text-solid-foreground ring-solid-foreground/20 absolute -top-3 left-3 rounded-full px-2.5 py-1 text-[11px] leading-none font-semibold whitespace-nowrap shadow-md ring-1">
                      {t(`showcase.labels.${label}`)}
                    </span>
                  )}
                </div>
              )
            )
          })}
        </div>
      </div>

      <div className="max-w-[30rem]">
        <p className="font-[family-name:var(--font-display)] text-[34px] leading-[1.1] font-bold tracking-[-0.02em] text-balance">
          {title}
        </p>
        <p className="text-solid-foreground/70 mt-3.5 max-w-[26rem] text-[15px] leading-relaxed">{body}</p>
      </div>
    </div>
  )
}

/** The four essentials, moving on by themselves: sign-in and sign-up are glanced at, not studied. */
function EssentialsCarousel({ language }: { language: string }) {
  const { t } = useTranslation('auth')
  const [viewportRef, api] = useEmblaCarousel({ loop: true, duration: 32 })
  const [selected, setSelected] = useState(0)
  const [pointerInside, setPointerInside] = useState(false)
  const [focusInside, setFocusInside] = useState(false)
  const [tabHidden, setTabHidden] = useState(() => document.hidden)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const held = pointerInside || focusInside || tabHidden

  useEffect(() => {
    if (!api) return
    const onSelect = () => setSelected(api.selectedScrollSnap())
    api.on('select', onSelect).on('reInit', onSelect)
    return () => {
      api.off('select', onSelect).off('reInit', onSelect)
    }
  }, [api])

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // Sign-up leads to the company step: its scene is ready by the time the account is.
  useEffect(() => preload(STEP_SCENES.company, language), [language])

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t('showcase.label')}
      className="flex min-h-0 flex-1 flex-col gap-8"
      onPointerEnter={() => setPointerInside(true)}
      onPointerLeave={() => setPointerInside(false)}
      onFocus={() => setFocusInside(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocusInside(false)
      }}
    >
      {/* Out to the panel's own edges, so a slide travels the full width rather than a window in it. */}
      <div ref={viewportRef} className="-mx-12 min-h-0 flex-1 overflow-hidden xl:-mx-14">
        <div className="flex h-full">
          {SLIDE_KEYS.map((key, i) => (
            <div
              key={key}
              role="group"
              aria-roledescription="slide"
              aria-hidden={i !== selected}
              className="h-full min-w-0 shrink-0 grow-0 basis-full"
            >
              <SceneView
                scene={SLIDES[key]}
                title={t(`showcase.slides.${key}.title`)}
                body={t(`showcase.slides.${key}.body`)}
                url={`${DEMO_SUBDOMAIN}.${SITE_DOMAIN}`}
                language={language}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {SLIDE_KEYS.map((key, i) => (
          <button
            key={key}
            type="button"
            aria-label={t('showcase.goTo', { title: t(`showcase.slides.${key}.title`) })}
            aria-current={i === selected || undefined}
            onClick={() => api?.scrollTo(i)}
            className={cn(
              'bg-solid-foreground/30 relative h-2 overflow-hidden rounded-full transition-all duration-300',
              i === selected ? 'w-7' : 'hover:bg-solid-foreground/55 w-2',
            )}
          >
            {i === selected && (
              <span
                // Keyed on the slide, so the fill starts over each time; the slide moves on when it is full.
                key={selected}
                data-testid="showcase-progress"
                className="bg-solid-foreground absolute inset-0 origin-left rounded-full"
                style={
                  !reducedMotion
                    ? {
                        animationName: 'grow-x',
                        animationDuration: `${ADVANCE_MS}ms`,
                        animationTimingFunction: 'linear',
                        animationPlayState: held ? 'paused' : 'running',
                      }
                    : undefined
                }
                onAnimationEnd={() => api?.scrollNext()}
              />
            )}
          </button>
        ))}
      </div>
    </section>
  )
}

/** One step's scene, laid out together and still; a new step fades its own in. */
function StepScene({ step, language }: { step: Step; language: string }) {
  const { t } = useTranslation('auth')
  const subdomain = useSitePreviewStore((state) => state.subdomain)

  useEffect(() => {
    const next = ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(step) + 1]
    if (next && next !== 'account') preload(STEP_SCENES[next], language)
  }, [step, language])

  return (
    <section aria-label={t('showcase.label')} className="flex min-h-0 flex-1 flex-col">
      <div
        key={step}
        className="-mx-12 min-h-0 flex-1 motion-safe:animate-[fade-in_400ms_ease-out] xl:-mx-14"
      >
        <SceneView
          scene={STEP_SCENES[step]}
          title={t(`showcase.steps.${step}.title`)}
          body={t(`showcase.steps.${step}.body`)}
          // The company step's URL is the one being typed beside it.
          url={`${subdomain || t('showcase.urlPlaceholder')}.${SITE_DOMAIN}`}
          language={language}
          staged
        />
      </div>
    </section>
  )
}

/**
 * The brand panel on every auth page. Sign-in and sign-up rotate the four essentials; each
 * onboarding step shows what it leads to, together and still.
 */
export function AuthShowcase({ step }: { step?: OnboardingStep }) {
  const { i18n } = useTranslation('auth')
  const language = i18n.resolvedLanguage === 'es' ? 'es' : 'en'

  return step && step !== 'account' ? (
    <StepScene step={step} language={language} />
  ) : (
    <EssentialsCarousel language={language} />
  )
}
