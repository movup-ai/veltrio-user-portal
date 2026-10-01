import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Car, ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/feedback/EmptyState'
import { Pagination } from '@/components/data-display/Pagination'
import { useFormatters } from '@/i18n'
import type { Vehicle } from '@/modules/vehicles/types/vehicle.types'
import { planRental, planTotal } from '@/modules/vehicles/utils/rate-plan'
import {
  formatRateOptionPrice,
  headlineRateOption,
  vehicleDisplayName,
  vehicleSubtitle,
} from '@/modules/vehicles/utils/vehicle.utils'

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

/**
 * Rows per page. Short enough that the picker never pushes the rest of the step off screen,
 * so the dates and the chosen car stay visible together.
 */
const PAGE_SIZE = 5

/** Full-width radio list of bookable vehicles — one row per car, price on the right. */
export function BookingVehiclePicker({
  options,
  selectedId,
  onSelect,
  hours,
  invalid,
}: BookingVehiclePickerProps) {
  const { t } = useTranslation('bookings')
  const { t: tCommon } = useTranslation('common')
  const format = useFormatters()
  const [page, setPage] = useState(1)
  const [pagedList, setPagedList] = useState('')

  // Free vehicles first — the conflicted ones are context, not choices. Memoized because the
  // reset effect below keys off it, and the parent rebuilds `options` on every render.
  const ordered = useMemo(
    () => [...options].sort((a, b) => Number(Boolean(a.bookedUntil)) - Number(Boolean(b.bookedUntil))),
    [options],
  )

  const totalPages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE))

  // Keyed on which cars are listed, not how many, so switching between two equally sized
  // branches still returns to page 1. Set during render rather than in an effect, which would
  // paint the stale page first.
  const listIdentity = ordered.map((o) => o.vehicle.id).join()
  if (listIdentity !== pagedList) {
    setPagedList(listIdentity)
    setPage(1)
  }

  if (options.length === 0) {
    return (
      <EmptyState
        icon={Car}
        title={t('form.vehicle.noneTitle')}
        description={t('form.vehicle.noneDescription')}
      />
    )
  }

  const start = (page - 1) * PAGE_SIZE
  const visible = ordered.slice(start, start + PAGE_SIZE)

  return (
    <>
      <div
        className={cn(
          'divide-border-soft divide-y',
          // The same 1px error edge an invalid input gets, rather than a heavier frame.
          invalid && 'outline-error rounded-lg outline -outline-offset-1',
        )}
        role="radiogroup"
        aria-label={t('form.vehicle.pick')}
        aria-invalid={invalid || undefined}
      >
        {visible.map(({ vehicle: v, bookedUntil }) => {
          const selected = v.id === selectedId
          const cover = v.photos[0]
          const headline = headlineRateOption(v)
          const plan = planRental(v.rateOptions, v.discountTiers, hours, v.billableHoursPerDay)
          const tripPrice = plan ? planTotal(plan) : null

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
                bookedUntil ? 'cursor-not-allowed opacity-55' : selected ? 'bg-tint' : 'hover:bg-surface-2',
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
            </button>
          )
        })}
      </div>

      {/* Hidden for a single page: one inert "1" button is noise, not navigation. */}
      {totalPages > 1 && (
        <div className="border-border-soft flex items-center justify-between gap-3 border-t px-4 py-3">
          <span className="text-fg-4 text-[12.5px] tabular-nums">
            {tCommon('table.countOf', { count: visible.length, total: ordered.length })}
          </span>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="justify-end" />
        </div>
      )}
    </>
  )
}
