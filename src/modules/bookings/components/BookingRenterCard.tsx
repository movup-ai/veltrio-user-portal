import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useFormatters } from '@/i18n'
import { initials } from '@/utils/formatting'
import type { BookingRenter } from '../types/booking.types'

interface BookingRenterCardProps {
  renter: BookingRenter
  onOpenProfile: () => void
  /**
   * The pre-handover checklist, rendered inside this card. Passed in rather than imported so
   * this stays a presentational card and the page keeps owning the verification wiring.
   */
  checklist?: React.ReactNode
}

/** Rows hold their place when empty — a renter added at the counter may have no licence on file yet. */
function Line({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-fg-3 shrink-0 text-[13px]">{label}</span>
      {value ? (
        <span
          className={`min-w-0 truncate text-[13px] ${mono ? 'font-mono text-[12px]' : 'font-semibold'}`}
        >
          {value}
        </span>
      ) : (
        <span className="text-fg-4 text-[13px]">—</span>
      )}
    </div>
  )
}

/** Who is renting, with just enough history to judge them at the counter. */
export function BookingRenterCard({ renter, onOpenProfile, checklist }: BookingRenterCardProps) {
  const { t } = useTranslation('bookings')
  const format = useFormatters()

  return (
    <Card className="flex flex-col p-[18px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-panel-title m-0">{t('details.renter.title')}</h2>
        <Button type="button" variant="outline" size="sm" onClick={onOpenProfile}>
          {t('details.renter.profile')}
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <span className="bg-tint text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold">
          {initials(renter.name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-semibold">{renter.name}</span>
          <span className="text-fg-4 block text-[11.5px]">
            {t('details.renter.since', { year: renter.since })} ·{' '}
            {t('details.renter.rentals', { count: renter.rentals })}
          </span>
        </span>
      </div>

      <div className="border-border-soft divide-border-soft mt-3 flex flex-col divide-y border-t pt-1">
        <Line label={t('details.renter.email')} value={renter.email} />
        <Line label={t('details.renter.phone')} value={renter.phone} mono />
        <Line label={t('details.renter.licence')} value={renter.licenceNumber} mono />
        <Line label={t('details.renter.lifetimeValue')} value={format.currency(renter.lifetimeValue)} />
      </div>

      {checklist && (
        <div className="border-border-soft mt-4 border-t pt-3.5">
          <h3 className="text-fg-3 m-0 mb-2.5 text-[11px] font-bold tracking-wide uppercase">
            {t('details.checklist.title')}
          </h3>
          {checklist}
        </div>
      )}
    </Card>
  )
}
