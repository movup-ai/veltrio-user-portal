import { useTranslation } from 'react-i18next'
import { Car, ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/feedback/EmptyState'
import { useFormatters } from '@/i18n'
import type { Vehicle } from '@/modules/vehicles/types/vehicle.types'
import { headlineRateOption, vehicleDisplayName, vehicleSubtitle } from '@/modules/vehicles/utils/vehicle.utils'
import { billableUnits, rentalDays } from '../utils/booking.pricing'

export interface VehicleOption {
  vehicle: Vehicle
  /**
   * ISO end of the clashing rental, when one exists. A conflicted vehicle is still listed —
   * "back Thursday" is what the counter needs to hear, and it beats an unexplained empty list.
   */
  bookedUntil?: string
}

interface BookingVehiclePickerProps {
  options: VehicleOption[]
  selectedId: string
  onSelect: (vehicle: Vehicle) => void
  /** Trip length, so each row can show the run-out cost alongside the headline rate. */
  hours: number
  invalid?: boolean
}

/** Full-width radio list of bookable vehicles — one row per car, price on the right. */
export function BookingVehiclePicker({ options, selectedId, onSelect, hours, invalid }: BookingVehiclePickerProps) {
  const { t } = useTranslation('bookings')
  const format = useFormatters()
  const days = rentalDays(hours)

  if (options.length === 0) {
    return <EmptyState icon={Car} title={t('form.vehicle.noneTitle')} description={t('form.vehicle.noneDescription')} />
  }

  // Free vehicles first — the conflicted ones are context, not choices.
  const ordered = [...options].sort((a, b) => Number(Boolean(a.bookedUntil)) - Number(Boolean(b.bookedUntil)))

  return (
    <div
      className={cn('divide-border-soft divide-y', invalid && 'rounded-lg outline-2 -outline-offset-1 outline-[var(--color-error)]')}
      role="radiogroup"
      aria-label={t('form.vehicle.pick')}
    >
      {ordered.map(({ vehicle: v, bookedUntil }) => {
        const selected = v.id === selectedId
        const cover = v.photos[0]
        const headline = headlineRateOption(v)
        const runOut = headline ? headline.rate * billableUnits(headline, hours) : null

        return (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={Boolean(bookedUntil)}
            onClick={() => onSelect(v)}
            className={cn(
              'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
              bookedUntil
                ? 'cursor-not-allowed opacity-55'
                : selected
                  ? 'bg-tint'
                  : 'hover:bg-surface-2',
            )}
          >
            <span
              className={cn(
                'flex size-[18px] shrink-0 items-center justify-center rounded-full border transition-colors',
                selected && !bookedUntil ? 'border-primary border-[5px]' : 'border-border-strong',
              )}
              aria-hidden
            />

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

            {bookedUntil ? (
              <span className="text-warning bg-warning-tint shrink-0 rounded-full px-2.5 py-1 text-[12.5px] font-semibold">
                {t('form.vehicle.bookedUntil', { date: format.shortDate(bookedUntil) })}
              </span>
            ) : (
              headline && (
                <span className="shrink-0 text-right">
                  <span className="block text-[14.5px] font-bold tabular-nums">
                    {t('form.vehicle.perUnit', { price: format.currency(headline.rate) })}
                  </span>
                  {runOut != null && (
                    <span className="text-fg-4 block text-[12.5px] tabular-nums">
                      {t('form.vehicle.forDays', { count: days, price: format.currency(runOut) })}
                    </span>
                  )}
                </span>
              )
            )}
          </button>
        )
      })}
    </div>
  )
}
