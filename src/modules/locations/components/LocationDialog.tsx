import { useEffect, useMemo } from 'react'
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
  type Location,
} from '../types/location.types'
import { fromTimeValue, toTimeValue } from '../utils/hours'

interface Props {
  /** Absent when adding; present when editing an existing branch. */
  location?: Location
  open: boolean
  onOpenChange: (open: boolean) => void
}

function locationSchema(t: TFunction<'locations'>) {
  return z
    .object({
      name: z.string().trim().min(1, t('form.nameRequired')).max(80),
      address: z.string().trim().max(200),
      status: z.enum(LOCATION_STATUSES),
      openingDays: z.enum(OPENING_DAYS),
      opensAt: z.string().min(1, t('form.hoursRequired')),
      closesAt: z.string().min(1, t('form.hoursRequired')),
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
    status: location?.status ?? 'Open',
    openingDays: location?.openingDays ?? 'monSun',
    opensAt: toTimeValue(location?.opensAt ?? 9 * 60),
    closesAt: toTimeValue(location?.closesAt ?? 18 * 60),
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
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: valuesFrom(location) })

  // The dialog stays mounted between openings, so it is reset each time rather than carrying
  // the previous branch's values into the next one.
  useEffect(() => {
    if (open) reset(valuesFrom(location))
  }, [open, location, reset])

  const pending = createLocation.isPending || updateLocation.isPending

  const onSubmit = handleSubmit((values) => {
    const input = {
      name: values.name,
      address: values.address,
      status: values.status,
      openingDays: values.openingDays,
      opensAt: fromTimeValue(values.opensAt),
      closesAt: fromTimeValue(values.closesAt),
    }
    const done = { onSuccess: () => onOpenChange(false) }

    if (location) updateLocation.mutate({ id: location.id, input }, done)
    else createLocation.mutate(input, done)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
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
            {({ id, invalid }) => <Input id={id} aria-invalid={invalid} {...register('address')} />}
          </FormField>

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
                <Input id={id} type="time" aria-invalid={invalid} {...register('opensAt')} />
              )}
            </FormField>

            <FormField label={t('form.closesAt')} required error={errors.closesAt?.message}>
              {({ id, invalid }) => (
                <Input id={id} type="time" aria-invalid={invalid} {...register('closesAt')} />
              )}
            </FormField>
          </div>

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
