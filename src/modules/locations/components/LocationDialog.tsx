import { useEffect, useId, useMemo, useState } from 'react'
import { ChevronRight, Star } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { TimePicker } from '@/components/ui/time-picker'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormField } from '@/components/forms/FormField'
import { useCreateLocation, useUpdateLocation } from '../hooks/use-locations'
import {
  LOCATION_STATUSES,
  OPENING_DAYS,
  type AddressPin,
  type Location,
} from '../types/location.types'
import { placesConfigured } from '../utils/places'
import { AddressPicker } from './AddressPicker'
import { fromTimeValue, toTimeValue } from '../utils/hours'

interface Props {
  /** Absent when adding; present when editing an existing branch. */
  location?: Location
  open: boolean
  onOpenChange: (open: boolean) => void
}

function optionalText(max: number) {
  return z.string().trim().max(max).optional()
}

/** An empty field means "not set", not an empty string, so the column stays null. */
function unset(value: string | undefined): string | undefined {
  return value?.trim() || undefined
}

function locationSchema(t: TFunction<'locations'>) {
  return z
    .object({
      name: z.string().trim().min(1, t('form.nameRequired')).max(80),
      address: z.string().trim().max(200),
      // Filled by the picker, or typed by hand when there is no Maps key. An untouched field
      // is dropped rather than sent as '', so the column stays null.
      street: optionalText(200),
      city: optionalText(120),
      state: optionalText(120),
      postalCode: optionalText(20),
      // Upper-cased at submit so 'us' and 'US' are the same country, matching the API.
      country: z
        .string()
        .trim()
        .optional()
        .refine((value) => !value || value.length === 2, { message: t('form.countryLength') }),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      status: z.enum(LOCATION_STATUSES),
      openingDays: z.enum(OPENING_DAYS),
      opensAt: z.string().min(1, t('form.hoursRequired')),
      closesAt: z.string().min(1, t('form.hoursRequired')),
      isDefault: z.boolean(),
      // Not an input. Holds what an existing branch already recorded; a new one takes its
      // value from `address` at submit.
      originalAddress: optionalText(200),
    })
    .refine((v) => fromTimeValue(v.closesAt) > fromTimeValue(v.opensAt), {
      path: ['closesAt'],
      message: t('form.closesBeforeOpens'),
    })
}

type FormValues = z.infer<ReturnType<typeof locationSchema>>

function valuesFrom(location: Location | undefined): FormValues {
  return {
    name: location?.name ?? '',
    address: location?.address ?? '',
    street: location?.street,
    city: location?.city,
    state: location?.state,
    postalCode: location?.postalCode,
    country: location?.country,
    latitude: location?.latitude,
    longitude: location?.longitude,
    status: location?.status ?? 'Open',
    openingDays: location?.openingDays ?? 'monSun',
    opensAt: toTimeValue(location?.opensAt ?? 9 * 60),
    closesAt: toTimeValue(location?.closesAt ?? 18 * 60),
    isDefault: location?.isDefault ?? false,
    originalAddress: location?.originalAddress,
  }
}

export function LocationDialog({ location, open, onOpenChange }: Props) {
  const { t } = useTranslation('locations')
  const createLocation = useCreateLocation()
  const updateLocation = useUpdateLocation()

  // `t` is re-created on language change, so the schema's messages follow.
  const schema = useMemo(() => locationSchema(t), [t])
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: valuesFrom(location) })

  const detailsId = useId()
  const [detailsOpen, setDetailsOpen] = useState(false)
  // True only once the expand transition has finished, so the panel stops clipping and a
  // focus ring can paint outside its box.
  const [settled, setSettled] = useState(false)

  /** The address parts move as a set, so they always describe the address on screen. */
  const setPin = (pin: AddressPin) => {
    setValue('street', pin.street)
    setValue('city', pin.city)
    setValue('state', pin.state)
    setValue('postalCode', pin.postalCode)
    setValue('country', pin.country)
    setValue('latitude', pin.latitude)
    setValue('longitude', pin.longitude)
  }

  // Covers switching branches while the dialog is already open — editing one, then another —
  // which changes `location` without remounting the form.
  useEffect(() => {
    if (open) reset(valuesFrom(location))
  }, [open, location, reset])

  const pending = createLocation.isPending || updateLocation.isPending

  const onSubmit = handleSubmit((values) => {
    // The spread carries name, address and the address parts through unchanged; only the
    // times need converting from the picker's `HH:mm` string to minutes.
    const input = {
      ...values,
      street: unset(values.street),
      city: unset(values.city),
      state: unset(values.state),
      postalCode: unset(values.postalCode),
      country: unset(values.country)?.toUpperCase(),
      originalAddress: location
        ? unset(values.originalAddress)
        : unset(values.originalAddress) ?? unset(values.address),
      opensAt: fromTimeValue(values.opensAt),
      closesAt: fromTimeValue(values.closesAt),
    }
    const done = { onSuccess: () => onOpenChange(false) }

    if (location) updateLocation.mutate({ id: location.id, input }, done)
    else createLocation.mutate(input, done)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{location ? t('form.editTitle') : t('form.addTitle')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormField label={t('form.name')} required error={errors.name?.message}>
            {({ id, invalid }) => (
              <Input
                id={id}
                aria-invalid={invalid}
                placeholder={t('form.namePlaceholder')}
                {...register('name')}
              />
            )}
          </FormField>

          <FormField
            label={t('form.address')}
            error={errors.address?.message}
            description={t('form.addressHint')}
          >
            {({ id, invalid, 'aria-describedby': describedBy }) => (
              <Controller
                control={control}
                name="address"
                render={({ field }) => (
                  <AddressPicker
                    // Seeded once, then owned by the picker: remounted so reopening the
                    // dialog for another branch starts from that branch's address.
                    key={location?.id ?? 'new'}
                    id={id}
                    invalid={invalid}
                    describedBy={describedBy}
                    value={field.value}
                    onChange={(address, pin) => {
                      field.onChange(address)
                      // Replaced as a set, so the parts always describe the address shown.
                      setPin(pin)
                    }}
                  />
                )}
              />
            )}
          </FormField>

          {/* Without a Maps key nothing fills these in, so they are offered by hand: a branch
              still gets a city and country for grouping and for a booking's pickup address. */}
          {!placesConfigured && (
            <div className="border-border-soft rounded-md border px-3 py-2">
              <button
                type="button"
                aria-expanded={detailsOpen}
                aria-controls={detailsId}
                onClick={() => {
                  setSettled(false)
                  setDetailsOpen((wasOpen) => !wasOpen)
                }}
                className="text-fg-2 hover:text-foreground flex w-full items-center gap-1.5 text-left text-[13px] font-medium transition-colors"
              >
                <ChevronRight
                  className={cn('size-3.5 transition-transform', detailsOpen && 'rotate-90')}
                  aria-hidden
                />
                {t('form.addressDetails')}
              </button>
              <div
                id={detailsId}
                className={cn(
                  'grid transition-[grid-template-rows] duration-200 ease-out',
                  detailsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
                onTransitionEnd={(event) => {
                  if (event.target === event.currentTarget) setSettled(detailsOpen)
                }}
              >
                <div className={cn(detailsOpen && settled ? 'overflow-visible' : 'overflow-hidden')}>
              <div className="mt-2 grid gap-4 p-1 sm:grid-cols-2">
                {/* Spans both columns: a street line is longer than the fields beneath it. */}
                <FormField
                  label={t('form.street')}
                  error={errors.street?.message}
                  className="sm:col-span-2"
                >
                  {({ id, invalid }) => (
                    <Input
                      id={id}
                      aria-invalid={invalid}
                      placeholder={t('form.streetPlaceholder')}
                      {...register('street')}
                    />
                  )}
                </FormField>
                <FormField label={t('form.city')} error={errors.city?.message}>
                  {({ id, invalid }) => (
                    <Input
                      id={id}
                      aria-invalid={invalid}
                      placeholder={t('form.cityPlaceholder')}
                      {...register('city')}
                    />
                  )}
                </FormField>
                <FormField label={t('form.state')} error={errors.state?.message}>
                  {({ id, invalid }) => (
                    <Input
                      id={id}
                      aria-invalid={invalid}
                      placeholder={t('form.statePlaceholder')}
                      {...register('state')}
                    />
                  )}
                </FormField>
                <FormField label={t('form.postalCode')} error={errors.postalCode?.message}>
                  {({ id, invalid }) => (
                    <Input
                      id={id}
                      aria-invalid={invalid}
                      placeholder={t('form.postalCodePlaceholder')}
                      {...register('postalCode')}
                    />
                  )}
                </FormField>
                <FormField label={t('form.country')} error={errors.country?.message}>
                  {({ id, invalid }) => (
                    <Input
                      id={id}
                      aria-invalid={invalid}
                      maxLength={2}
                      className="uppercase"
                      placeholder={t('form.countryPlaceholder')}
                      {...register('country')}
                    />
                  )}
                </FormField>
              </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t('form.status')} error={errors.status?.message}>
              {({ id }) => (
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id={id}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCATION_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {t(`status.${status === 'Open' ? 'open' : 'closed'}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </FormField>

            <FormField label={t('form.openingDays')} error={errors.openingDays?.message}>
              {({ id }) => (
                <Controller
                  control={control}
                  name="openingDays"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id={id}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPENING_DAYS.map((days) => (
                          <SelectItem key={days} value={days}>
                            {t(`hours.${days}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </FormField>

            <FormField label={t('form.opensAt')} required error={errors.opensAt?.message}>
              {({ id, invalid }) => (
                <Controller
                  control={control}
                  name="opensAt"
                  render={({ field }) => (
                    <TimePicker
                      id={id}
                      invalid={invalid}
                      aria-label={t('form.opensAt')}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              )}
            </FormField>

            <FormField label={t('form.closesAt')} required error={errors.closesAt?.message}>
              {({ id, invalid }) => (
                <Controller
                  control={control}
                  name="closesAt"
                  render={({ field }) => (
                    <TimePicker
                      id={id}
                      invalid={invalid}
                      aria-label={t('form.closesAt')}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              )}
            </FormField>
          </div>

          <Controller
            control={control}
            name="isDefault"
            render={({ field }) => {
              // The only default cannot be turned off — moving it means setting another
              // branch, so the switch is held on rather than silently doing nothing.
              const locked = Boolean(location?.isDefault)
              return (
                <div className="border-border-soft flex items-center gap-3 rounded-md border p-3">
                  <Star
                    className={cn('size-4 shrink-0', field.value ? 'text-primary' : 'text-fg-4')}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-[13px] font-medium">{t('form.makeDefault')}</p>
                    <p className="text-fg-3 m-0 text-caption">
                      {locked ? t('form.alreadyDefault') : t('form.makeDefaultHint')}
                    </p>
                  </div>
                  <Switch
                    checked={field.value}
                    disabled={locked}
                    aria-label={t('form.makeDefault')}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )
            }}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('form.cancel')}
            </Button>
            <Button type="submit" loading={pending}>
              {location ? t('form.save') : t('form.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
