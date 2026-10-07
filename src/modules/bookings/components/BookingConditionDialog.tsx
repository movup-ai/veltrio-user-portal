import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
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
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { useFormatters } from '@/i18n'
import { CONDITION_NOTES_MAX } from '../constants/booking.constants'
import { useConditionPhotoDraft } from '../hooks/use-condition-photos'
import {
  type BookingCondition,
  type ConditionStage,
  type FuelLevel,
  type HandoverInput,
} from '../types/booking.types'
import { checkOdometer } from '../utils/booking.condition'
import { BookingConditionPhotos } from './BookingConditionPhotos'
import { FuelGauge } from './FuelGauge'

interface BookingConditionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stage: ConditionStage
  /** What was read going out, which a return is measured against. Absent on older rentals. */
  pickup?: BookingCondition
  /** The odometer on the vehicle's file, which a pickup starts from. */
  vehicleMileage?: number
  /** An electric car is read for charge rather than fuel; the scale is the same. */
  electric?: boolean
  loading: boolean
  onSubmit: (input: HandoverInput) => void
}

/**
 * The car's readings, damage and photos, taken as it changes hands. A draft until it is
 * submitted: cancelling stores nothing, photos included.
 */
export function BookingConditionDialog({ open, onOpenChange, stage, ...form }: BookingConditionDialogProps) {
  const { t } = useTranslation('bookings')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] gap-5 overflow-y-auto outline-none sm:max-w-[560px]"
        onOpenAutoFocus={focusDialogContent}
      >
        <DialogHeader>
          <DialogTitle>
            {t(stage === 'pickup' ? 'details.actions.handOver' : 'details.actions.returnVehicle')}
          </DialogTitle>
          <DialogDescription>{t(`details.condition.description.${stage}`)}</DialogDescription>
        </DialogHeader>
        {/* Mounted per opening, so an abandoned attempt does not greet the next one. */}
        {open && <ConditionForm stage={stage} {...form} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function ConditionForm({
  stage,
  pickup,
  vehicleMileage,
  electric = false,
  loading,
  onSubmit,
  onCancel,
}: Omit<BookingConditionDialogProps, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const { t } = useTranslation('bookings')
  const { t: tCommon } = useTranslation('common')
  const format = useFormatters()
  const returning = stage === 'return'
  const level = electric ? 'charge' : 'fuel'
  // A return's odometer is read off the car, never carried over: the default would be the wrong one.
  const [odometer, setOdometer] = useState(
    !returning && vehicleMileage !== undefined ? String(vehicleMileage) : '',
  )
  const [fuelLevel, setFuelLevel] = useState<FuelLevel>()
  const [notes, setNotes] = useState('')
  const [sendToService, setSendToService] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const draft = useConditionPhotoDraft()

  const miles = (value: number) => t('details.condition.miles', { miles: format.number(value) })
  const reading = checkOdometer(odometer, returning ? pickup?.odometer : undefined)
  const read = 'odometer' in reading ? reading.odometer : undefined
  const odometerError =
    attempted && 'error' in reading
      ? reading.error === 'belowPickup' && pickup
        ? t('details.condition.odometerBelowPickup', { miles: miles(pickup.odometer) })
        : t('details.condition.odometerInvalid')
      : undefined
  // Not an error: the file may be the one that is wrong. The API keeps the reading either way.
  const belowFile = !returning && read !== undefined && vehicleMileage !== undefined && read < vehicleMileage

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        setAttempted(true)
        if (read === undefined || fuelLevel === undefined) return
        onSubmit({
          odometer: read,
          fuelLevel,
          notes,
          photos: draft.photos.map((photo) => photo.file),
          ...(returning && { sendToService }),
        })
      }}
    >
      <FormField
        label={t('details.condition.odometer')}
        error={odometerError}
        description={
          returning && pickup
            ? t('details.condition.atPickup', { value: miles(pickup.odometer) })
            : belowFile
              ? t('details.condition.odometerBelowFile', { miles: miles(vehicleMileage) })
              : undefined
        }
        required
      >
        {(field) => (
          <div className="relative">
            <Input
              {...field}
              inputMode="numeric"
              autoComplete="off"
              value={odometer}
              onChange={(event) => setOdometer(event.target.value)}
              className="pr-9 tabular-nums"
            />
            <span
              aria-hidden
              className="text-fg-3 pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px]"
            >
              {t('details.condition.unit')}
            </span>
          </div>
        )}
      </FormField>

      <FormField
        label={t(`details.condition.level.${level}.label`)}
        error={
          attempted && fuelLevel === undefined ? t(`details.condition.level.${level}.required`) : undefined
        }
        description={
          returning && pickup
            ? t('details.condition.atPickup', {
                value: t(`details.condition.fuelLevels.${pickup.fuelLevel}`),
              })
            : undefined
        }
        required
      >
        {(field) => (
          <FuelGauge
            {...field}
            label={t(`details.condition.level.${level}.label`)}
            value={fuelLevel}
            onChange={setFuelLevel}
          />
        )}
      </FormField>

      <FormField label={t(`details.condition.notes.${stage}`)} description={t('details.condition.notesHint')}>
        {(field) => (
          <Textarea
            rows={3}
            maxLength={CONDITION_NOTES_MAX}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            {...field}
          />
        )}
      </FormField>

      <div className="flex flex-col gap-1.5">
        <p className="text-label m-0">{t('details.condition.photos.label')}</p>
        <BookingConditionPhotos photos={draft.photos} onAdd={draft.add} onRemove={draft.remove} />
      </div>

      {returning && (
        <FormField label={t('details.condition.next.label')}>
          {({ id, 'aria-describedby': describedBy }) => (
            <RadioGroup
              id={id}
              aria-label={t('details.condition.next.label')}
              aria-describedby={describedBy}
              value={sendToService ? 'service' : 'available'}
              onValueChange={(value) => setSendToService(value === 'service')}
              className="sm:grid-cols-2"
            >
              {(['available', 'service'] as const).map((value) => (
                <label
                  key={value}
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-[13px] transition-colors',
                    sendToService === (value === 'service')
                      ? 'border-primary bg-tint font-semibold'
                      : 'border-border hover:bg-surface-2',
                  )}
                >
                  <RadioGroupItem value={value} />
                  {t(`details.condition.next.${value}`)}
                </label>
              ))}
            </RadioGroup>
          )}
        </FormField>
      )}

      <DialogFooter className="mt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          {tCommon('actions.cancel')}
        </Button>
        <Button type="submit" loading={loading}>
          {t(returning ? 'details.actions.returnVehicle' : 'details.actions.handOver')}
        </Button>
      </DialogFooter>
    </form>
  )
}
