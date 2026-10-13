import { useTranslation } from 'react-i18next'
import { ImageOff } from 'lucide-react'
import { useFormatters } from '@/i18n'
import { planRental, planTotal } from '@/modules/vehicles/utils/rate-plan'
import {
  formatRateOptionPrice,
  headlineRateOption,
  vehicleDisplayName,
  vehicleSubtitle,
} from '@/modules/vehicles/utils/vehicle.utils'
import { isTaken } from '../utils/booking.vehicle-options'
import type { VehicleOption } from './BookingVehiclePicker'

interface BookingVehicleRowProps {
  option: VehicleOption
  /** Trip length, so the row can show the run-out cost alongside the headline rate. */
  hours: number
}

/** One car as a list offers it: cover, name and plate, then its price or why it cannot be had. */
export function BookingVehicleRow({ option, hours }: BookingVehicleRowProps) {
  const { t } = useTranslation('bookings')
  const format = useFormatters()
  const { vehicle: v, bookedUntil, outOn } = option
  const cover = v.photos[0]
  const headline = headlineRateOption(v)
  const plan = planRental(v.rateOptions, v.discountTiers, hours, v.billableHoursPerDay)
  const tripPrice = plan ? planTotal(plan) : null

  return (
    <>
      <span className="border-border bg-surface-2 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border">
        {cover ? (
          <img src={cover.url} alt="" className="size-full object-cover" />
        ) : (
          <ImageOff className="text-fg-4 size-4" aria-hidden />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-semibold">{vehicleDisplayName(v)}</span>
        <span className="text-fg-4 block truncate text-[12.5px]">
          {[vehicleSubtitle(v), v.location, v.plate].filter(Boolean).join(' · ')}
        </span>
      </span>

      {isTaken(option) ? (
        <span className="text-warning bg-warning-tint shrink-0 rounded-full px-2.5 py-1 text-[12.5px] font-semibold">
          {bookedUntil
            ? t('form.vehicle.bookedUntil', { date: format.shortDate(bookedUntil) })
            : t('form.vehicle.outOn', { reference: outOn })}
        </span>
      ) : (
        headline && (
          <span className="shrink-0 text-right">
            {/* The suffix follows the option's own basis: the headline is the
                cheapest rate, which is not always a daily one. */}
            <span className="block text-[14.5px] font-bold tabular-nums">
              {formatRateOptionPrice(headline)}
            </span>
            {tripPrice != null && (
              // The cost engine's price, so the row matches the total the booking bills.
              <span className="text-fg-4 block text-[12.5px] tabular-nums">
                {t('form.vehicle.forTrip', { price: format.currency(tripPrice) })}
              </span>
            )}
          </span>
        )
      )}
    </>
  )
}
