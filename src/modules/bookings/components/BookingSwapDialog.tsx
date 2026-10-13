import { useId, useMemo, useState } from 'react'
import { Car } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { focusDialogContent } from '@/components/ui/dialog-focus'
import { holdDialogInPlace } from '@/components/ui/dialog-hold'
import { Switch } from '@/components/ui/switch'
import { useWholeFleet } from '@/modules/vehicles/hooks/use-vehicles'
import { normalizeApiError } from '@/services/api/errors'
import { useChangeDraft } from '../hooks/use-booking-change'
import { useBookingSchedule } from '../hooks/use-bookings'
import type { BookingDetails } from '../types/booking.types'
import { changeError, swapOptions } from '../utils/booking.change'
import { durationHours } from '../utils/booking.pricing'
import { BookingChangeSummary } from './BookingChangeSummary'
import { BookingVehicleSelect } from './BookingVehicleSelect'

interface BookingSwapDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: Pick<
    BookingDetails,
    'reference' | 'vehicleId' | 'pickupAt' | 'returnAt' | 'pickupLocation' | 'total'
  >
  renterName: string
}

/** Another vehicle for a booking not yet picked up, on the same dates, at its rates or the price kept. */
export function BookingSwapDialog({ open, onOpenChange, ...form }: BookingSwapDialogProps) {
  const { t } = useTranslation('bookings')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] gap-5 overflow-y-auto outline-none sm:max-w-[560px]"
        onOpenAutoFocus={focusDialogContent}
      >
        <DialogHeader>
          <DialogTitle>{t('details.change.swap.title')}</DialogTitle>
          <DialogDescription>
            {t('details.change.swap.description', { name: form.renterName })}
          </DialogDescription>
        </DialogHeader>
        {/* Mounted per opening, so no car is left picked from the time before. */}
        {open && <SwapForm {...form} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function SwapForm({
  booking,
  renterName,
  onClose,
}: Pick<BookingSwapDialogProps, 'booking' | 'renterName'> & { onClose: () => void }) {
  const { t } = useTranslation('bookings')
  const { t: tCommon } = useTranslation('common')
  const keepId = useId()
  const [vehicleId, setVehicleId] = useState('')
  const [keepPrice, setKeepPrice] = useState(false)
  // Every car, not those free today: whether one can be had is decided on the booking's dates.
  const fleet = useWholeFleet()
  const schedule = useBookingSchedule(booking.pickupAt, booking.returnAt, true)
  const vehicles = fleet.data
  const options = useMemo(
    () => swapOptions(vehicles ?? [], schedule.data ?? [], booking),
    [vehicles, schedule.data, booking],
  )
  const draft = useChangeDraft(
    booking.reference,
    renterName,
    vehicleId ? { vehicleId, keepPrice } : undefined,
  )
  const refusal = draft.refused ? changeError(draft.refused) : undefined

  // Not until the schedule is in: without it every car would read as free.
  if (!vehicles || !schedule.isReady) {
    return fleet.isError || schedule.isError ? (
      <ErrorState
        description={t('form.vehicle.loadError')}
        onRetry={() => {
          void fleet.refetch()
          void schedule.refetch()
        }}
        className="py-6"
      />
    ) : (
      <LoadingState label={t('form.vehicle.loading')} className="py-10" />
    )
  }

  if (options.length === 0) {
    return (
      <>
        <EmptyState
          icon={Car}
          title={t('details.change.swap.noneTitle')}
          description={t('details.change.swap.noneDescription')}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tCommon('actions.back')}
          </Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <form
      ref={holdDialogInPlace}
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        draft.submit(onClose)
      }}
    >
      {/* A field, not the list laid out: a fleet of any size has to fit a dialog. */}
      <FormField label={t('details.change.swap.vehicle')}>
        {({ id }) => (
          <BookingVehicleSelect
            id={id}
            options={options}
            selectedId={vehicleId}
            onSelect={(vehicle) => {
              draft.reset()
              setVehicleId(vehicle.id)
            }}
            hours={durationHours(booking.pickupAt, booking.returnAt)}
            placeholder={t('details.change.swap.search')}
            emptyText={t('details.change.swap.noMatch')}
          />
        )}
      </FormField>

      <div className="flex items-start gap-3">
        <Switch
          id={keepId}
          checked={keepPrice}
          onCheckedChange={(checked) => {
            draft.reset()
            setKeepPrice(checked)
          }}
          className="mt-0.5"
        />
        <label htmlFor={keepId} className="flex cursor-pointer flex-col">
          <span className="text-[13.5px] font-semibold">{t('details.change.swap.keepPrice')}</span>
          <span className="text-fg-4 text-[12px]">{t('details.change.swap.keepPriceHint')}</span>
        </label>
      </div>

      {draft.refused && (
        <p role="alert" className="text-caption text-error m-0">
          {refusal ? t(`details.change.errors.${refusal}`) : normalizeApiError(draft.refused).message}
        </p>
      )}
      {/* There before a car is picked: appearing with one, it made the dialog jump. */}
      <BookingChangeSummary
        quote={draft.quote}
        loading={draft.loading}
        renterName={renterName}
        currentTotal={booking.total}
        priceKept={keepPrice}
      />

      <DialogFooter className="mt-1">
        <Button type="button" variant="outline" onClick={onClose} disabled={draft.saving}>
          {tCommon('actions.cancel')}
        </Button>
        <Button type="submit" disabled={!draft.ready} loading={draft.saving}>
          {t('details.change.swap.submit')}
        </Button>
      </DialogFooter>
    </form>
  )
}
