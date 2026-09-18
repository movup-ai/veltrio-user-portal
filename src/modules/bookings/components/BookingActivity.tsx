import { CalendarPlus, Car, CreditCard, IdCard, Mail } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { useFormatters } from '@/i18n'
import type { BookingEvent, BookingEventEntry } from '../types/booking.types'

const EVENT_ICONS: Record<BookingEvent, LucideIcon> = {
  created: CalendarPlus,
  depositHold: CreditCard,
  licenceUploaded: IdCard,
  confirmationSent: Mail,
  vehicleAssigned: Car,
}

interface BookingActivityProps {
  events: BookingEventEntry[]
}

/**
 * Audit trail for the booking, oldest first. Each entry's detail line is assembled from whatever
 * the event carries rather than a per-event sentence — the separator reads the same in any
 * language, and a new event kind needs only a title to slot in.
 */
export function BookingActivity({ events }: BookingActivityProps) {
  const { t } = useTranslation('bookings')
  const format = useFormatters()

  function detailFor(event: BookingEventEntry): string {
    const when = format.date(event.at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    const meta = event.meta ?? {}

    // Blank parts are dropped, not just missing ones — a renter with no licence on file would
    // otherwise leave the line trailing a separator.
    const parts = [
      meta.channel != null ? t(`details.channels.${meta.channel}` as 'details.channels.web') : null,
      meta.amount != null ? format.currency(Number(meta.amount)) : null,
      meta.card,
      meta.licence,
      meta.plate,
      meta.actor,
    ].filter((part) => part != null && String(part).trim() !== '')

    return [when, ...parts].join(' · ')
  }

  return (
    <Card as="section" className="flex flex-col p-[18px]">
      <PanelHeading title={t('details.activity.title')} className="mb-3.5" />

      <ol className="flex flex-col gap-3.5">
        {events.map((event) => {
          const Icon = EVENT_ICONS[event.key]

          return (
            <li key={`${event.key}-${event.at}`} className="flex items-start gap-2.5">
              <span className="bg-tint text-primary flex size-7 shrink-0 items-center justify-center rounded-[8px]">
                <Icon className="size-3.5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold">{t(`details.events.${event.key}`)}</span>
                <span className="text-fg-4 block text-[11.5px]">{detailFor(event)}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
