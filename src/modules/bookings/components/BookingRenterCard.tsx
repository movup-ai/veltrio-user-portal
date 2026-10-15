import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useFormatters } from '@/i18n'
import { initials } from '@/utils/formatting'
import type { AdditionalDriver, BookingRenter } from '../types/booking.types'

interface BookingRenterCardProps {
  renter: BookingRenter
  /** Who else is named on the agreement to drive. Nothing is shown for a booking with none. */
  drivers?: AdditionalDriver[]
  /** Opens the renter's own page. Absent for a renter with no customer behind them. */
  onOpenProfile?: () => void
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
        <span className={`min-w-0 truncate text-[13px] ${mono ? 'font-mono text-[12px]' : 'font-semibold'}`}>
          {value}
        </span>
      ) : (
        <span className="text-fg-4 text-[13px]">—</span>
      )}
    </div>
  )
}

/** Who is renting, with just enough history to judge them at the counter. */
export function BookingRenterCard({
  renter,
  drivers = [],
  onOpenProfile,
  checklist,
}: BookingRenterCardProps) {
  const { t } = useTranslation('bookings')
  const format = useFormatters()

  return (
    <Card className="flex flex-col p-[18px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-panel-title m-0">{t('details.renter.title')}</h2>
        <Button type="button" variant="outline" size="sm" disabled={!onOpenProfile} onClick={onOpenProfile}>
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

      {drivers.length > 0 && (
        <div className="border-border-soft mt-4 border-t pt-3.5">
          <h3 className="text-fg-3 m-0 mb-1 text-[11px] font-bold tracking-wide uppercase">
            {t('details.renter.drivers')}
          </h3>
          <ul className="divide-border-soft m-0 flex list-none flex-col divide-y p-0">
            {drivers.map((driver) => (
              <li key={driver.id} className="py-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-[13px] font-semibold">{driver.name}</span>
                  <span className="text-fg-3 shrink-0 text-[12px]">
                    {t('details.vehicle.perDay', { rate: format.currency(driver.pricePerDay) })}
                  </span>
                </div>
                <p className="text-fg-3 m-0 text-[12px]">
                  {driver.licenceNumber ? (
                    <>
                      <span className="font-mono">{driver.licenceNumber}</span>
                      {driver.licenceState && ` · ${driver.licenceState}`}
                      {driver.licenceExpiry &&
                        ` · ${t('details.renter.expires', { date: format.shortDate(driver.licenceExpiry) })}`}
                    </>
                  ) : (
                    t('details.renter.licenceAtPickup')
                  )}
                </p>
                {driver.licenceCheck && (
                  <p className="text-fg-3 m-0 text-[12px]">
                    {t(driver.licenceCheck.by ? 'details.renter.checkedBy' : 'details.renter.checked', {
                      name: driver.licenceCheck.by,
                      date: format.dateTime(driver.licenceCheck.at),
                    })}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

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
