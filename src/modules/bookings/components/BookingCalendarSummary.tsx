import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { useFormatters } from '@/i18n'
import type { Booking } from '../types/booking.types'
import { rentalDuration } from '../utils/booking.details'
import { durationLabel } from '../utils/booking.utils'

interface BookingCalendarSummaryProps {
  booking: Booking
  /** As the bar shows it: `Ready`, `Overdue` and `Declined` included. */
  status: string
}

/** What a bar opens. Its own component so none of this is worked out for a bar nobody clicks. */
export function BookingCalendarSummary({ booking, status }: BookingCalendarSummaryProps) {
  const { t } = useTranslation('bookings')
  const format = useFormatters()

  // The booked length, to match the booked times beside it; the booking's page has the real one.
  const duration = durationLabel(
    rentalDuration({ from: new Date(booking.pickupAt), to: new Date(booking.returnAt) }),
    t,
  )
  const facts = [
    {
      term: t('details.pickup.title'),
      value: format.dateTime(booking.pickupAt),
      note: booking.pickupLocation,
    },
    {
      term: t('details.return.title'),
      value: format.dateTime(booking.returnAt),
      note: booking.returnLocation,
    },
    { term: t('details.return.duration'), value: duration },
    { term: t('columns.total'), value: format.currency(booking.pricing.total) },
  ]

  return (
    <>
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <p className="m-0 truncate text-[14.5px] font-semibold">{booking.customer.name}</p>
          <p className="text-fg-3 m-0 truncate text-[12.5px]">
            {booking.vehicleName} · <span className="font-mono">{booking.vehiclePlate}</span>
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <dl className="border-border-soft m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 border-t px-4 py-3 text-[12.5px]">
        {facts.map(({ term, value, note }) => (
          <div key={term} className="contents">
            <dt className="text-fg-4">{term}</dt>
            <dd className="m-0 min-w-0 text-right font-medium tabular-nums">
              {value}
              {note && <span className="text-fg-4 block truncate font-normal">{note}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <div className="border-border-soft flex items-center justify-between gap-3 border-t px-4 py-3">
        <span className="text-fg-3 font-mono text-[12px]">{booking.reference}</span>
        <Button asChild size="sm">
          <Link to={`/bookings/${booking.reference}`}>
            {t('calendar.openBooking')}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </>
  )
}
