import { useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
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
import { useDebounced } from '@/lib/use-debounced'
import { normalizeApiError } from '@/services/api/errors'
import { useChangeDraft } from '../hooks/use-booking-change'
import { additionalDriversSchema, type AdditionalDriversValues } from '../schema/booking.schema'
import type { BookingDetails, ChangeRequest } from '../types/booking.types'
import { changeError, driversRequest, startingDrivers } from '../utils/booking.change'
import { AdditionalDriversEditor } from './AdditionalDriversEditor'
import { BookingChangeSummary } from './BookingChangeSummary'

interface BookingDriversDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: Pick<BookingDetails, 'reference' | 'additionalDrivers' | 'total'>
  renterName: string
}

/** Who else may drive a booking not yet picked up: add, correct or take off, and see the price. */
export function BookingDriversDialog({ open, onOpenChange, ...form }: BookingDriversDialogProps) {
  const { t } = useTranslation('bookings')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] gap-5 overflow-y-auto outline-none sm:max-w-[640px]"
        onOpenAutoFocus={focusDialogContent}
      >
        <DialogHeader>
          <DialogTitle>{t('details.change.drivers.title')}</DialogTitle>
          <DialogDescription>{t('form.drivers.hint')}</DialogDescription>
        </DialogHeader>
        {/* Mounted per opening, so it starts from the drivers the booking has now. */}
        {open && <DriversForm {...form} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function DriversForm({
  booking,
  renterName,
  onClose,
}: Pick<BookingDriversDialogProps, 'booking' | 'renterName'> & { onClose: () => void }) {
  const { t } = useTranslation('bookings')
  const { t: tCommon } = useTranslation('common')
  const { t: tValidation } = useTranslation('validation')
  const schema = useMemo(() => additionalDriversSchema(tValidation), [tValidation])
  const {
    control,
    formState: { errors, isValid, isSubmitted },
    handleSubmit,
  } = useForm<AdditionalDriversValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      additionalDrivers: startingDrivers(booking.additionalDrivers, () => crypto.randomUUID()),
    },
  })
  const drivers = useWatch({ control, name: 'additionalDrivers' })

  // As text, so it compares by what it says: a name being typed is priced once, when it rests.
  const asked = isValid ? JSON.stringify(driversRequest(drivers, booking.additionalDrivers) ?? null) : 'null'
  const rested = useDebounced(asked)
  const request = useMemo(() => (JSON.parse(rested) as ChangeRequest | null) ?? undefined, [rested])
  const draft = useChangeDraft(booking.reference, renterName, request)
  const refusal = draft.refused ? changeError(draft.refused) : undefined

  return (
    <form
      ref={holdDialogInPlace}
      className="flex flex-col gap-4"
      // Through the form's own check, so a row left half filled shows what it is missing.
      onSubmit={handleSubmit(() => draft.submit(onClose))}
    >
      <Controller
        control={control}
        name="additionalDrivers"
        render={({ field }) => (
          <AdditionalDriversEditor
            value={field.value}
            onChange={(next) => {
              draft.reset()
              field.onChange(next)
            }}
            errors={errors.additionalDrivers}
            showAllErrors={isSubmitted}
          />
        )}
      />

      {draft.refused && (
        <p role="alert" className="text-caption text-error m-0">
          {refusal ? t(`details.change.errors.${refusal}`) : normalizeApiError(draft.refused).message}
        </p>
      )}
      {/* There from the start, whatever the list: coming and going, it would make the dialog jump. */}
      <BookingChangeSummary
        quote={draft.quote}
        loading={draft.loading}
        renterName={renterName}
        currentTotal={booking.total}
        hideRates
      />

      <DialogFooter className="mt-1">
        <Button type="button" variant="outline" onClick={onClose} disabled={draft.saving}>
          {tCommon('actions.cancel')}
        </Button>
        {/* Not until what was typed last has been priced: saved sooner, it would be the list before it. */}
        <Button type="submit" disabled={!draft.ready || rested !== asked} loading={draft.saving}>
          {t('details.change.drivers.submit')}
        </Button>
      </DialogFooter>
    </form>
  )
}
