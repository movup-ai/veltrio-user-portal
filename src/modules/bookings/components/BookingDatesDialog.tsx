import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
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
import { TimePicker } from '@/components/ui/time-picker'
import { useFormatters } from '@/i18n'
import { MAX_RENTAL_DAYS } from '@/modules/vehicles/constants/rate-plan.constants'
import { normalizeApiError } from '@/services/api/errors'
import { BOOKING_TIME_STEP_MINUTES } from '../constants/booking.constants'
import { useChangeDraft } from '../hooks/use-booking-change'
import { useBookingSchedule, useVehicleHolds } from '../hooks/use-bookings'
import type { BookingDetails } from '../types/booking.types'
import {
  blockedPickupDays,
  changeError,
  chosenWindow,
  datesRequest,
  holdsWindow,
  lastReturnDay,
  otherHolds,
  pickupBlocked,
  returnBlocked,
  stillOut,
  tripChoice,
  windowClash,
  windowProblem,
  withDate,
  type TripChoice,
} from '../utils/booking.change'
import { BookingChangeSummary } from './BookingChangeSummary'

interface BookingDatesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: Pick<BookingDetails, 'reference' | 'vehicleId' | 'pickupAt' | 'returnAt' | 'total'>
  renterName: string
}

/** Other dates for a booking not yet picked up: pick them, see the new price, and save at it. */
export function BookingDatesDialog({ open, onOpenChange, ...form }: BookingDatesDialogProps) {
  const { t } = useTranslation('bookings')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] gap-5 overflow-y-auto outline-none sm:max-w-[580px]"
        onOpenAutoFocus={focusDialogContent}
      >
        <DialogHeader>
          <DialogTitle>{t('details.change.dates.title')}</DialogTitle>
          <DialogDescription>{t('details.change.dates.description')}</DialogDescription>
        </DialogHeader>
        {/* Mounted per opening, so it starts from the dates the booking has now. */}
        {open && <DatesForm {...form} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function DatesForm({
  booking,
  renterName,
  onClose,
}: Pick<BookingDatesDialogProps, 'booking' | 'renterName'> & { onClose: () => void }) {
  const { t } = useTranslation('bookings')
  const { t: tCommon } = useTranslation('common')
  const format = useFormatters()
  // Read once: what counts as past must not shift under a dialog left open.
  const [now] = useState(() => new Date())
  const [choice, setChoice] = useState(() => tripChoice(booking))
  const chosen = chosenWindow(choice)
  const problem = chosen && windowProblem(chosen, now)
  const request = problem ? undefined : datesRequest(choice, booking)
  const draft = useChangeDraft(booking.reference, renterName, request)
  const refusal = draft.refused ? changeError(draft.refused) : undefined
  const taken = refusal === 'vehicle_unavailable'
  // Asked only once the API has said the car is taken, to name the booking in the way.
  const schedule = useBookingSchedule(chosen?.pickupAt ?? '', chosen?.returnAt ?? '', taken)
  const clash = taken && chosen && schedule.isReady ? windowClash(schedule.data ?? [], booking) : undefined

  // Read ahead as far as a rental can run twice over, so the pickers can strike out what is taken.
  const [ahead] = useState(() => holdsWindow(now))
  const { data: held = [] } = useVehicleHolds(booking.vehicleId, ahead.from, ahead.to)
  const others = otherHolds(held, booking)
  const timeTaken = {
    pickup: (time: string) => pickupBlocked(others, choice.pickupDate, time),
    return: (time: string) =>
      Boolean(chosen) && returnBlocked(others, chosen?.pickupAt ?? '', choice.returnDate, time),
  }

  const set = (next: TripChoice) => {
    draft.reset()
    setChoice(next)
  }
  const end = (side: 'pickup' | 'return', invalid: boolean) => (
    <div className="grid grid-cols-[1fr_140px] gap-3">
      <FormField label={t(`details.change.dates.${side}Date`)}>
        {({ id }) => (
          <DatePicker
            id={id}
            value={choice[`${side}Date`]}
            // A return before the pickup's day is never right; the hour is checked below.
            min={side === 'return' ? choice.pickupDate : undefined}
            max={side === 'return' && chosen ? lastReturnDay(others, chosen.pickupAt) : undefined}
            blocked={side === 'pickup' ? blockedPickupDays(others) : undefined}
            invalid={invalid}
            onChange={(date) => set(withDate(choice, side, date, others))}
          />
        )}
      </FormField>
      <FormField label={t(`details.change.dates.${side}Time`)}>
        {({ id }) => (
          <TimePicker
            id={id}
            value={choice[`${side}Time`]}
            minuteStep={BOOKING_TIME_STEP_MINUTES}
            blocked={timeTaken[side]}
            invalid={invalid}
            onChange={(time) => set({ ...choice, [`${side}Time`]: time })}
          />
        )}
      </FormField>
    </div>
  )

  return (
    <form
      ref={holdDialogInPlace}
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        draft.submit(onClose)
      }}
    >
      {/* Marked when what is picked is now struck out, as moving the other end can make it. */}
      {end('pickup', timeTaken.pickup(choice.pickupTime))}
      {end('return', Boolean(problem) || timeTaken.return(choice.returnTime))}

      {problem && (
        <p role="alert" className="text-caption text-error m-0">
          {t(`details.change.dates.problems.${problem}`, { days: MAX_RENTAL_DAYS })}
        </p>
      )}
      {!problem && draft.refused && (
        <p role="alert" className="text-caption text-error m-0">
          {clash
            ? t(`details.change.dates.${chosen && stillOut(clash, chosen.pickupAt) ? 'clashOut' : 'clash'}`, {
                reference: clash.reference,
                from: format.dateTime(clash.from),
                to: format.dateTime(clash.to),
              })
            : refusal
              ? t(`details.change.errors.${refusal}`)
              : normalizeApiError(draft.refused).message}
        </p>
      )}
      {/* There from the start, whatever is picked: coming and going, it made the dialog jump. */}
      <BookingChangeSummary
        quote={draft.quote}
        loading={draft.loading}
        renterName={renterName}
        currentTotal={booking.total}
        showLength
        dates={chosen && !problem ? chosen : undefined}
      />

      <DialogFooter className="mt-1">
        <Button type="button" variant="outline" onClick={onClose} disabled={draft.saving}>
          {tCommon('actions.cancel')}
        </Button>
        <Button type="submit" disabled={!draft.ready} loading={draft.saving}>
          {t('details.change.dates.submit')}
        </Button>
      </DialogFooter>
    </form>
  )
}
