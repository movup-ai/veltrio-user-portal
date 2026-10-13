import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useDomainLabels } from '@/i18n/domain'
import { CALENDAR_STATUSES, type CalendarStatus } from '../types/booking-calendar.types'
import { calendarLook } from '../utils/booking.calendar'

interface BookingCalendarLegendProps {
  hidden: ReadonlySet<CalendarStatus>
  onToggle: (status: CalendarStatus) => void
  /** Rentals drawn in the window after every filter. */
  count: number
}

/** The key to the bar colours, and the status filter: each entry switches its bars on and off. */
export function BookingCalendarLegend({ hidden, onToggle, count }: BookingCalendarLegendProps) {
  const { t } = useTranslation('bookings')
  const domain = useDomainLabels()

  return (
    <div className="border-border-soft flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-4 py-3">
      <div role="group" aria-label={t('calendar.legend')} className="flex flex-wrap items-center gap-1.5">
        {CALENDAR_STATUSES.map((status) => {
          const shown = !hidden.has(status)
          const look = calendarLook(status)
          return (
            <button
              key={status}
              type="button"
              aria-pressed={shown}
              onClick={() => onToggle(status)}
              className={cn(
                'flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium transition-colors',
                shown
                  ? 'border-border text-fg-2 hover:bg-surface-3'
                  : 'text-fg-4 hover:text-fg-2 border-transparent line-through',
              )}
            >
              {/* Filled with the status's strong colour; a request keeps its box's pale, dashed look. */}
              <span
                aria-hidden
                className={cn(
                  'size-2.5 rounded-[3px] border',
                  look.outlined && 'border-dashed',
                  !shown && 'opacity-40',
                )}
                style={{ background: look.outlined ? look.fill : look.accent, borderColor: look.accent }}
              />
              {domain.status(status)}
            </button>
          )
        })}
      </div>
      <span className="text-fg-4 ml-auto text-[12px]">{t('calendar.count', { count })}</span>
    </div>
  )
}
