import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Car } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDateFormat } from '@/i18n/formatters'
import type {
  CalendarColumn,
  CalendarRow,
  CalendarVehicle,
  TimelineView,
} from '../types/booking-calendar.types'
import { timelineFraction } from '../utils/booking.calendar'
import { BookingCalendarBar } from './BookingCalendarBar'

/** Narrowest a column gets before the track scrolls sideways instead of squeezing its bars. */
const MIN_COLUMN_PX: Record<TimelineView, number> = { day: 56, week: 104, month: 30 }

const BAR_PX = 28
const LANE_GAP_PX = 5
const ROW_PAD_PX = 10
/** Room for the vehicle's thumbnail, so an idle car's row is as tall as a booked one. */
const MIN_ROW_PX = 56

const HOUR: Intl.DateTimeFormatOptions = { hour: 'numeric' }
const WEEKDAY: Intl.DateTimeFormatOptions = { weekday: 'short' }
const FULL_DAY: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }

const LABEL_CELL =
  'bg-surface border-border-soft sticky left-0 flex w-[var(--cal-label)] shrink-0 items-center border-r px-3 sm:px-4'

interface BookingCalendarTimelineProps {
  view: TimelineView
  columns: CalendarColumn[]
  rows: CalendarRow[]
  now: number
  /** A day's heading opens that day; a day view has no further to go. */
  onOpenDay: (day: Date) => void
}

function VehicleCell({ vehicle }: { vehicle: CalendarVehicle }) {
  const body = (
    <>
      <span className="bg-surface-3 text-fg-3 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[8px] max-sm:hidden">
        {vehicle.image ? (
          <img src={vehicle.image} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <Car className="size-4" aria-hidden />
        )}
      </span>
      <span className="min-w-0">
        <span className="group-hover:text-primary block truncate text-[13px] font-semibold transition-colors">
          {vehicle.name}
        </span>
        <span className="text-fg-4 block truncate font-mono text-[11px]">{vehicle.plate}</span>
      </span>
    </>
  )
  const className = cn(LABEL_CELL, 'z-20 gap-2.5')

  return vehicle.id ? (
    <Link to={`/vehicles/${vehicle.id}`} className={cn(className, 'group focus-visible:-outline-offset-2')}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

/** One row per vehicle against hours or days: what is out, what is due, and where the gaps are. */
export function BookingCalendarTimeline({
  view,
  columns,
  rows,
  now,
  onOpenDay,
}: BookingCalendarTimelineProps) {
  const { t } = useTranslation('bookings')
  const hour = useDateFormat(HOUR)
  const weekday = useDateFormat(WEEKDAY)
  const fullDay = useDateFormat(FULL_DAY)
  const scroller = useRef<HTMLDivElement>(null)

  const gridTemplateColumns = `repeat(${columns.length}, minmax(0, 1fr))`
  const nowAt = timelineFraction(columns, now)
  const isCurrent = (column: CalendarColumn) => now >= column.start.getTime() && now < column.end.getTime()

  // On a new window only, not as the minute ticks: scrolling back under the reader would fight them.
  useLayoutEffect(() => {
    const element = scroller.current
    if (!element) return
    const at = timelineFraction(columns, Date.now())
    const label = element.querySelector<HTMLElement>('[data-calendar-label]')?.offsetWidth ?? 0
    // A third of the way in: what is coming matters more than what has just passed.
    const lead = (element.clientWidth - label) / 3
    element.scrollLeft = at === null ? 0 : Math.max(0, (element.scrollWidth - label) * at - lead)
  }, [columns])

  return (
    <div
      ref={scroller}
      className="vx-scroll max-h-[max(340px,calc(100dvh-360px))] overflow-auto rounded-t-xl [--cal-label:132px] sm:[--cal-label:216px]"
    >
      <div
        className="relative isolate"
        style={{ minWidth: `calc(var(--cal-label) + ${columns.length * MIN_COLUMN_PX[view]}px)` }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 left-[var(--cal-label)] grid"
          style={{ gridTemplateColumns }}
        >
          {columns.map((column) => (
            <div
              key={column.start.getTime()}
              className={cn(
                'border-border-soft border-l first:border-l-0',
                view !== 'day' && isCurrent(column) && 'bg-primary/5',
              )}
            />
          ))}
        </div>

        <div className="bg-surface border-border sticky top-0 z-30 flex border-b">
          <div data-calendar-label className={cn(LABEL_CELL, 'text-table-header z-10')}>
            {t('columns.vehicle')}
          </div>
          <div className="grid flex-1" style={{ gridTemplateColumns }}>
            {columns.map((column) =>
              view === 'day' ? (
                <div
                  key={column.start.getTime()}
                  className={cn(
                    'py-2.5 text-center text-[10.5px] font-medium whitespace-nowrap tabular-nums',
                    isCurrent(column) ? 'text-primary font-semibold' : 'text-fg-4',
                  )}
                >
                  {hour(column.start)}
                </div>
              ) : (
                <button
                  key={column.start.getTime()}
                  type="button"
                  onClick={() => onOpenDay(column.start)}
                  aria-label={t('calendar.openDay', { date: fullDay(column.start) })}
                  aria-current={isCurrent(column) ? 'date' : undefined}
                  className={cn(
                    'hover:bg-surface-3 flex items-center justify-center gap-1.5 py-1.5 transition-colors focus-visible:-outline-offset-2',
                    view === 'month' && 'flex-col gap-0',
                  )}
                >
                  <span className="text-fg-4 text-[10.5px] font-medium">{weekday(column.start)}</span>
                  <span
                    className={cn(
                      'flex size-6 items-center justify-center rounded-full text-[12.5px] font-semibold tabular-nums',
                      isCurrent(column) ? 'bg-primary text-primary-foreground' : 'text-fg-2',
                    )}
                  >
                    {column.start.getDate()}
                  </span>
                </button>
              ),
            )}
          </div>
        </div>

        {rows.map((row) => {
          const stack = row.lanes * BAR_PX + (row.lanes - 1) * LANE_GAP_PX
          const height = Math.max(MIN_ROW_PX, stack + ROW_PAD_PX * 2)
          return (
            <div key={row.vehicle.key} className="border-border-soft flex border-b last:border-b-0">
              <VehicleCell vehicle={row.vehicle} />
              <div className="relative flex-1" style={{ height }}>
                {row.bars.map((bar) => (
                  <BookingCalendarBar
                    key={bar.booking.reference}
                    bar={bar}
                    view={view}
                    top={(height - stack) / 2 + bar.lane * (BAR_PX + LANE_GAP_PX)}
                    height={BAR_PX}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {nowAt !== null && (
          // Over the bars but under the vehicle column. The halo keeps it visible on an on-rental
          // bar, which is the line's own colour.
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 left-[var(--cal-label)] z-[15]"
          >
            <div
              className="bg-primary absolute inset-y-0 w-0.5 -translate-x-1/2 shadow-[0_0_0_1px_var(--color-surface)]"
              style={{ left: `${nowAt * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
