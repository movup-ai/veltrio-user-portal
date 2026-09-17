import { useTranslation } from 'react-i18next'
import { Car, Check, ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/feedback/EmptyState'
import { useFormatters } from '@/i18n'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import type { Vehicle } from '@/modules/vehicles/types/vehicle.types'
import { headlineRateOption, vehicleDisplayName, vehicleSubtitle } from '@/modules/vehicles/utils/vehicle.utils'

interface BookingVehiclePickerProps {
  vehicles: Vehicle[]
  selectedId: string
  onSelect: (vehicle: Vehicle) => void
  invalid?: boolean
}

/** Grid of selectable fleet cards — the booking form's "which car" step. */
export function BookingVehiclePicker({ vehicles, selectedId, onSelect, invalid }: BookingVehiclePickerProps) {
  const { t } = useTranslation('bookings')
  const format = useFormatters()

  if (vehicles.length === 0) {
    return <EmptyState icon={Car} title={t('form.vehicle.noneTitle')} description={t('form.vehicle.noneDescription')} />
  }

  return (
    <div
      className={cn('grid gap-3', invalid && 'rounded-[11px] outline-2 outline-offset-4 outline-[var(--color-error)]')}
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
      role="radiogroup"
      aria-label={t('form.vehicle.pick')}
    >
      {vehicles.map((v) => {
        const selected = v.id === selectedId
        const cover = v.photos[0]
        const headline = headlineRateOption(v)

        return (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(v)}
            className={cn(
              'group bg-surface relative flex items-start gap-3 rounded-[11px] border p-3 text-left transition-colors',
              selected ? 'border-primary bg-tint' : 'border-border hover:border-fg-4 hover:bg-surface-2',
            )}
          >
            <span className="border-border bg-surface-2 flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[9px] border">
              {cover ? (
                <img src={cover.url} alt="" className="size-full object-cover" />
              ) : (
                <ImageOff className="text-fg-4 size-5" aria-hidden />
              )}
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-2">
                <span className="block truncate text-[13.5px] font-semibold">{vehicleDisplayName(v)}</span>
                {selected && (
                  <span className="bg-primary flex size-[18px] shrink-0 items-center justify-center rounded-full">
                    <Check className="size-3 text-white" aria-hidden />
                  </span>
                )}
              </span>
              <span className="text-fg-4 block text-[11.5px]">{vehicleSubtitle(v)}</span>
              <span className="text-fg-4 mt-0.5 block font-mono text-[11.5px]">{v.plate}</span>
              <span className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={v.status} />
                {headline && (
                  <span className="text-[12.5px] font-semibold tabular-nums">{format.currency(headline.rate)}</span>
                )}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
