import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useDateFormat } from '@/i18n/formatters'
import type { CalendarMonth } from '../types/booking-calendar.types'
import { calendarDay, heatLevel } from '../utils/booking.calendar'

type Heat = ReturnType<typeof heatLevel>

const HEAT_FILL: Record<Heat, string> = {
  0: 'bg-surface-3',
  1: 'bg-primary/15',
  2: 'bg-primary/30',
  3: 'bg-primary/50',
  4: 'bg-primary',
}

const HEAT_LEVELS: Heat[] = [0, 1, 2, 3, 4]

// Read in UTC: the grid's dates hold the company's clock there (`companyWall`).
const MONTH: Intl.DateTimeFormatOptions = { month: 'long', timeZone: 'UTC' }
const MONTH_AND_YEAR: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric', timeZone: 'UTC' }
const WEEKDAY_INITIAL: Intl.DateTimeFormatOptions = { weekday: 'narrow', timeZone: 'UTC' }
const DAY: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
}

function dayStyle(level: Heat): string {
  if (level === 0) return 'text-fg-2 hover:bg-surface-3'
  // Dark text until the fill is solid: on the half-strength teal, white falls below contrast.
  return cn(
    HEAT_FILL[level],
    level === 4 ? 'text-primary-foreground' : 'text-foreground',
    'hover:brightness-95',
  )
}

interface BookingCalendarYearProps {
  months: CalendarMonth[]
  /** Vehicles out per day, keyed `YYYY-MM-DD`. */
  booked: Map<string, number>
  fleetSize: number
  now: number
  onOpenDay: (day: Date) => void
  onOpenMonth: (month: Date) => void
}

/** Twelve months at a glance: how much of the fleet is out each day, darker for busier. */
export function BookingCalendarYear({
  months,
  booked,
  fleetSize,
  now,
  onOpenDay,
  onOpenMonth,
}: BookingCalendarYearProps) {
  const { t } = useTranslation('bookings')
  const month = useDateFormat(MONTH)
  const monthAndYear = useDateFormat(MONTH_AND_YEAR)
  const weekdayInitial = useDateFormat(WEEKDAY_INITIAL)
  const dayLabel = useDateFormat(DAY)
  const today = calendarDay(new Date(now))
  // A month's second row is always seven real days, in the order the grid lays weekdays out.
  const weekdays = months[0].cells.slice(7, 14) as Date[]

  return (
    <div className="flex flex-col">
      <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3 xl:grid-cols-4">
        {months.map(({ start, cells }) => (
          <section key={start.getTime()} className="border-border-soft rounded-lg border p-3.5">
            <button
              type="button"
              onClick={() => onOpenMonth(start)}
              aria-label={t('calendar.openMonth', { month: monthAndYear(start) })}
              className="hover:text-primary mb-2.5 block text-[13.5px] font-semibold transition-colors first-letter:uppercase"
            >
              {month(start)}
            </button>

            <div className="grid grid-cols-7 gap-1">
              {weekdays.map((weekday) => (
                <span
                  key={weekday.getUTCDay()}
                  aria-hidden
                  className="text-fg-4 pb-1 text-center text-[10.5px] font-medium uppercase"
                >
                  {weekdayInitial(weekday)}
                </span>
              ))}
              {cells.map((day, index) => {
                if (!day) return <span key={`blank-${index}`} />
                const key = calendarDay(day)
                const count = booked.get(key) ?? 0
                const date = dayLabel(day)
                const label =
                  count > 0
                    ? t('calendar.year.booked', { date, count, total: Math.max(fleetSize, count) })
                    : t('calendar.year.idle', { date })
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onOpenDay(day)}
                    aria-label={label}
                    title={label}
                    aria-current={key === today ? 'date' : undefined}
                    className={cn(
                      'flex h-8 items-center justify-center rounded-[7px] text-[12px] font-medium tabular-nums transition-colors',
                      dayStyle(heatLevel(count, fleetSize)),
                      key === today && 'ring-foreground ring-[1.5px] ring-inset',
                    )}
                  >
                    {day.getUTCDate()}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="border-border-soft text-fg-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t px-4 py-3 text-[12px]">
        <span>{t('calendar.year.legend')}</span>
        <span className="flex items-center gap-1.5">
          {t('calendar.year.less')}
          {HEAT_LEVELS.map((level) => (
            <span key={level} aria-hidden className={cn('size-3 rounded-[3px]', HEAT_FILL[level])} />
          ))}
          {t('calendar.year.more')}
        </span>
      </div>
    </div>
  )
}
