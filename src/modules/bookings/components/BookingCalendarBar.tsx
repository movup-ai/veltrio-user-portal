import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useFormatters } from '@/i18n'
import { useDomainLabels } from '@/i18n/domain'
import { companyDay } from '@/utils/company-time'
import { initials } from '@/utils/formatting'
import type { CalendarBar, TimelineView } from '../types/booking-calendar.types'
import { calendarLook } from '../utils/booking.calendar'
import { BookingCalendarSummary } from './BookingCalendarSummary'

interface BookingCalendarBarProps {
  bar: CalendarBar
  view: TimelineView
  /** Pixels from the top of the row: bars that overlap on one car sit in lanes. */
  top: number
  height: number
}

/**
 * The rows are rebuilt on every keystroke in the search box and every minute, so a bar arrives as
 * a new object each time. Compared by what it holds, an unchanged bar is not rendered again.
 */
function sameBar(a: BookingCalendarBarProps, b: BookingCalendarBarProps): boolean {
  return (
    a.view === b.view &&
    a.top === b.top &&
    a.height === b.height &&
    (Object.keys(a.bar) as (keyof CalendarBar)[]).every((key) => a.bar[key] === b.bar[key])
  )
}

/** One rental on a vehicle's row. Opens a summary rather than the booking, so a look costs no page. */
export const BookingCalendarBar = memo(function BookingCalendarBar({
  bar,
  view,
  top,
  height,
}: BookingCalendarBarProps) {
  const { t } = useTranslation('bookings')
  const format = useFormatters()
  const domain = useDomainLabels()
  const { booking, status } = bar
  const look = calendarLook(status)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [hovered, setHovered] = useState(false)

  const pickup = format.dateTime(booking.pickupAt)
  const due = format.dateTime(booking.returnAt)

  // Hours alone only where both ends share a day: "9 AM – 2 PM" on a four-day rental misleads.
  const sameDay = companyDay(booking.pickupAt) === companyDay(booking.returnAt)
  const clock = (iso: string) => format.date(iso, { hour: 'numeric', minute: '2-digit' })
  const span = sameDay
    ? `${clock(booking.pickupAt)} – ${clock(booking.returnAt)}`
    : view === 'day'
      ? `${pickup} – ${due}`
      : `${format.shortDate(booking.pickupAt)} – ${format.shortDate(booking.returnAt)}`

  const label = t('calendar.bar', {
    reference: booking.reference,
    customer: booking.customer.name,
    vehicle: booking.vehicleName,
    status: domain.status(status),
    from: pickup,
    to: due,
  })

  return (
    // Hover names the bar, a click opens the summary; the tooltip steps aside while that is open.
    <Tooltip open={hovered && !summaryOpen} onOpenChange={setHovered}>
      <Popover open={summaryOpen} onOpenChange={setSummaryOpen}>
        {/* Hover only: focus returning from the summary would otherwise pop the tooltip up again. */}
        <TooltipTrigger asChild onFocus={(event) => event.preventDefault()}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={label}
              className={cn(
                // Clipped, not hidden: `overflow-hidden` would make the bar the label's scroll container.
                '@container absolute z-10 flex min-w-2.5 items-center overflow-clip rounded-[7px] text-left text-[11.5px] whitespace-nowrap',
                // A hairline of the page colour, so rentals back to back read as two boxes.
                'ring-surface ring-1 transition-[filter,box-shadow] hover:brightness-95 data-[state=open]:shadow-sm',
                bar.startsBefore && 'rounded-l-none',
                bar.endsAfter && 'rounded-r-none',
                look.outlined && 'border border-dashed border-current',
              )}
              style={{
                top,
                height,
                left: `${bar.start * 100}%`,
                width: `${(bar.end - bar.start) * 100}%`,
                color: look.text,
                // Tints are translucent in the dark theme; the surface under them hides the grid lines.
                backgroundColor: 'var(--color-surface)',
                backgroundImage: `linear-gradient(${look.fill}, ${look.fill})`,
              }}
            >
              {/* Sticks to the vehicle column, so a bar that began off-screen still says whose it is. */}
              <span className="sticky left-[var(--cal-label)] flex max-w-full min-w-0 items-center gap-1.5 px-1 @min-[4.5rem]:px-2">
                {/* What fits, narrowest first: "…", initials, the name, then the reference and the times. */}
                <span aria-hidden className="hidden font-semibold @min-[1rem]:block @min-[2rem]:hidden">
                  …
                </span>
                <span className="hidden font-semibold @min-[2rem]:block @min-[4.5rem]:hidden">
                  {initials(booking.customer.name)}
                </span>
                <span className="hidden min-w-0 truncate font-semibold @min-[4.5rem]:block">
                  {booking.customer.name}
                </span>
                <span className="hidden shrink-0 font-mono text-[10.5px] opacity-85 @min-[11.5rem]:block">
                  {booking.reference}
                </span>
                <span className="hidden shrink-0 opacity-85 @min-[20rem]:block">{span}</span>
              </span>
            </button>
          </PopoverTrigger>
        </TooltipTrigger>

        <PopoverContent align="start" collisionPadding={12} className="w-[300px] p-0">
          <BookingCalendarSummary booking={booking} status={status} />
        </PopoverContent>
      </Popover>

      <TooltipContent side="top" className="flex flex-col gap-0.5">
        <span className="font-semibold">
          {booking.customer.name} · {booking.reference}
        </span>
        <span className="opacity-80">
          {pickup} – {due}
        </span>
      </TooltipContent>
    </Tooltip>
  )
}, sameBar)
