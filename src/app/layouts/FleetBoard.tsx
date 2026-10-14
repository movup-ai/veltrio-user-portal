import { Check } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

type Status = 'Active' | 'Confirmed' | 'Pending' | 'Completed'

interface Booking {
  from: number
  to: number
  status: Status
  selected?: boolean
}

const OPEN = 8
const CLOSE = 18
const NOW = 13.5
const AXIS = [8, 10, 12, 14, 16]
const LEGEND: Status[] = ['Active', 'Confirmed', 'Pending', 'Completed']
const CHECKS = ['agreement', 'licence', 'deposit'] as const

// A picture of the product, so its plates are sample data rather than copy to translate.
const FLEET: { plate: string; bookings: Booking[] }[] = [
  { plate: 'FLR 2041', bookings: [{ from: 8.5, to: 16, status: 'Active' }] },
  {
    plate: 'KTX 8812',
    bookings: [
      { from: 8, to: 10, status: 'Completed' },
      { from: 14.5, to: 18, status: 'Confirmed' },
    ],
  },
  { plate: 'BRV 1190', bookings: [{ from: 15, to: 18, status: 'Confirmed', selected: true }] },
  {
    plate: 'MNT 5530',
    bookings: [
      { from: 9, to: 12, status: 'Completed' },
      { from: 16, to: 18, status: 'Pending' },
    ],
  },
  { plate: 'JDS 7724', bookings: [{ from: 11, to: 18, status: 'Active' }] },
]

const BAR: Record<Status, string> = {
  Active: 'bg-brand-mint',
  Confirmed: 'bg-solid-foreground',
  Pending: 'border border-dashed border-solid-foreground/70',
  Completed: 'bg-solid-foreground/20',
}

const at = (hour: number) => `${((hour - OPEN) / (CLOSE - OPEN)) * 100}%`

function Plate({ children }: { children: string }) {
  return (
    <span className="border-solid-foreground/35 inline-flex h-6 shrink-0 items-center rounded-[5px] border px-1.5 font-[family-name:var(--font-display)] text-[11px] font-semibold tracking-[0.06em] whitespace-nowrap">
      {children}
    </span>
  )
}

/** A counter's day at a glance, drawn rather than described. Decorative: the headline beside it says it. */
export function FleetBoard({ className }: { className?: string }) {
  const { t, i18n } = useTranslation(['auth', 'domain'])
  const time = useMemo(() => {
    const hour = new Intl.DateTimeFormat(i18n.resolvedLanguage, { hour: 'numeric' })
    const minute = new Intl.DateTimeFormat(i18n.resolvedLanguage, { hour: 'numeric', minute: '2-digit' })
    // A fixed day, never today: only the language's way of writing an hour is wanted.
    const on = (h: number) => new Date(2026, 0, 5, Math.floor(h), (h % 1) * 60)
    return { hour: (h: number) => hour.format(on(h)), minute: (h: number) => minute.format(on(h)) }
  }, [i18n.resolvedLanguage])

  return (
    <div
      aria-hidden
      className={cn(
        'bg-primary-solid text-solid-foreground rounded-2xl p-6 shadow-[0_30px_60px_-24px_rgb(0_0_0/0.55)]',
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-[family-name:var(--font-display)] text-[16px] font-semibold">
          {t('auth:brandPanel.board.today')}
        </p>
        <ul className="text-solid-foreground/75 flex flex-wrap justify-end gap-x-3.5 gap-y-1 text-[11.5px]">
          {LEGEND.map((status) => (
            <li key={status} className="flex items-center gap-1.5">
              <span className={cn('h-2 w-3.5 rounded-[3px]', BAR[status])} />
              {t(`domain:status.${status}`)}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex gap-3">
        <div className="flex flex-col gap-2 pt-7">
          {FLEET.map(({ plate }) => (
            <div key={plate} className="flex h-8 items-center">
              <Plate>{plate}</Plate>
            </div>
          ))}
        </div>

        <div className="relative flex-1 pb-6">
          <div className="text-solid-foreground/60 relative h-5 text-[11px]">
            {AXIS.map((hour) => (
              <span key={hour} className="absolute top-0" style={{ left: at(hour) }}>
                {time.hour(hour)}
              </span>
            ))}
          </div>
          {AXIS.map((hour) => (
            <span
              key={hour}
              className="bg-solid-foreground/10 absolute top-6 bottom-6 w-px"
              style={{ left: at(hour) }}
            />
          ))}

          <div className="mt-2 flex flex-col gap-2">
            {FLEET.map(({ plate, bookings }, row) => (
              <div key={plate} className="relative h-8">
                {bookings.map((booking, i) => (
                  <span
                    key={i}
                    className={cn(
                      'animate-bar-grow absolute inset-y-1.5 rounded-[5px]',
                      BAR[booking.status],
                      booking.selected && 'ring-brand-mint ring-offset-primary-solid ring-2 ring-offset-2',
                    )}
                    style={{
                      left: at(booking.from),
                      width: at(OPEN + booking.to - booking.from),
                      animationDelay: `${(row * 2 + i) * 55}ms`,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Drawn over the bars, as on the real calendar; its time sits below, clear of the hours. */}
          <div className="absolute top-6 bottom-5 w-0.5 -translate-x-1/2" style={{ left: at(NOW) }}>
            <span className="bg-brand-amber absolute inset-0" />
            <span className="bg-brand-amber text-brand-deep absolute top-full left-1/2 -translate-x-1/2 rounded-[4px] px-1.5 py-px text-[10.5px] font-bold whitespace-nowrap">
              {time.minute(NOW)}
            </span>
          </div>
        </div>
      </div>

      {/* The first thing to go on a short screen, so the board itself can stay. */}
      <div className="border-solid-foreground/15 mt-3 border-t pt-5 [@media(max-height:780px)]:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Plate>BRV 1190</Plate>
            <span className="truncate text-[14px] font-semibold">{t('auth:brandPanel.board.vehicle')}</span>
          </div>
          <span className="text-solid-foreground/75 shrink-0 text-[12.5px]">
            {t('auth:brandPanel.board.pickup', { time: time.minute(15) })}
          </span>
        </div>
        <ul className="mt-3.5 flex flex-wrap gap-x-5 gap-y-2">
          {CHECKS.map((check) => (
            <li key={check} className="flex items-center gap-1.5 text-[12.5px]">
              <Check className="text-brand-mint size-3.5" strokeWidth={3} />
              {t(`auth:brandPanel.board.checks.${check}`)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
