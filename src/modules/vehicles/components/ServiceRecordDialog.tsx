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
import { DatePicker } from '@/components/ui/date-picker'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormField } from '@/components/forms/FormField'
import { translateDomain } from '@/i18n/domain'
import { useCreateServiceRecord, useUpdateServiceRecord } from '../hooks/use-service-records'
import { SERVICE_TYPES, type ServiceRecord } from '../types/service-record.types'

interface Props {
  vehicleId: string
  /** Absent when logging new work; present when editing an existing entry. */
  record?: ServiceRecord
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** `YYYY-MM-DD` in the viewer's own timezone — `toISOString` would shift the day near midnight. */
function today(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

function serviceSchema(t: TFunction<'vehicles'>) {
  return z.object({
    serviceType: z.enum(SERVICE_TYPES),
    performedOn: z
      .string()
      .min(1, t('service.form.dateRequired'))
      .refine((value) => value <= today(), t('service.form.dateInFuture')),
    // The empty string is what an emptied number input reports, and it means "not recorded".
    odometer: z.union([z.number().int().min(0), z.literal('')]),
    cost: z.union([z.number().min(0), z.literal('')]),
    vendor: z.string().max(120),
    notes: z.string().max(2000),
    nextDueOn: z.string(),
    nextDueOdometer: z.union([z.number().int().min(0), z.literal('')]),
  })
    .refine((v) => !v.nextDueOn || v.nextDueOn > v.performedOn, {
      path: ['nextDueOn'],
      message: t('service.form.dueBeforePerformed'),
    })
    .refine(
      (v) => v.nextDueOdometer === '' || v.odometer === '' || v.nextDueOdometer > v.odometer,
      { path: ['nextDueOdometer'], message: t('service.form.dueOdometerTooLow') },
    )
}

type FormValues = z.infer<ReturnType<typeof serviceSchema>>

function valuesFrom(record: ServiceRecord | undefined): FormValues {
  return {
    serviceType: record?.serviceType ?? 'Oil change',
    performedOn: record?.performedOn ?? today(),
    odometer: record?.odometer ?? '',
    cost: record?.cost ?? '',
    vendor: record?.vendor ?? '',
    notes: record?.notes ?? '',
    nextDueOn: record?.nextDueOn ?? '',
    nextDueOdometer: record?.nextDueOdometer ?? '',
  }
}

export function ServiceRecordDialog({ vehicleId, record, open, onOpenChange }: Props) {
  const { t } = useTranslation('vehicles')
  const createRecord = useCreateServiceRecord(vehicleId)
  const updateRecord = useUpdateServiceRecord(vehicleId)

  // `t` is re-created on language change, so the schema's messages follow.
  const schema = useMemo(() => serviceSchema(t), [t])
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: valuesFrom(record) })

  // The dialog stays mounted between openings, so the form is reset each time rather than
  // carrying the previous record's values into the next one.
  useEffect(() => {
    if (open) reset(valuesFrom(record))
  }, [open, record, reset])

  const pending = createRecord.isPending || updateRecord.isPending

  const onSubmit = handleSubmit((values) => {
    const input = {
      serviceType: values.serviceType,
      performedOn: values.performedOn,
      odometer: values.odometer === '' ? undefined : values.odometer,
      cost: values.cost === '' ? undefined : values.cost,
      vendor: values.vendor || undefined,
      notes: values.notes || undefined,
      nextDueOn: values.nextDueOn || undefined,
      nextDueOdometer: values.nextDueOdometer === '' ? undefined : values.nextDueOdometer,
    }
    const done = { onSuccess: () => onOpenChange(false) }

    if (record) updateRecord.mutate({ recordId: record.id, input }, done)
    else createRecord.mutate(input, done)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{record ? t('service.form.editTitle') : t('service.form.addTitle')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t('service.form.type')} required error={errors.serviceType?.message}>
              {({ id }) => (
                <Controller
                  control={control}
                  name="serviceType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id={id}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {translateDomain('serviceType', type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </FormField>

            <FormField label={t('service.form.date')} required error={errors.performedOn?.message}>
              {({ id, invalid }) => (
                <Controller
                  control={control}
                  name="performedOn"
                  render={({ field }) => (
                    <DatePicker
                      id={id}
                      aria-label={t('service.form.date')}
                      value={field.value}
                      onChange={field.onChange}
                      max={today()}
                      invalid={invalid}
                    />
                  )}
                />
              )}
            </FormField>

            <FormField label={t('service.form.odometer')} error={errors.odometer?.message}>
              {({ id, invalid }) => (
                <Input id={id} type="number" min={0} aria-invalid={invalid} {...register('odometer', { setValueAs: (v) => (v === '' ? '' : Number(v)) })} />
              )}
            </FormField>

            <FormField label={t('service.form.cost')} error={errors.cost?.message}>
              {({ id, invalid }) => (
                <Input id={id} type="number" min={0} step="0.01" aria-invalid={invalid} {...register('cost', { setValueAs: (v) => (v === '' ? '' : Number(v)) })} />
              )}
            </FormField>
          </div>

          <div className="border-border rounded-md border p-4">
            <p className="m-0 text-[13px] font-semibold">{t('service.form.nextDueTitle')}</p>
            <p className="text-fg-3 m-0 mt-0.5 mb-3 text-[12.5px]">
              {t('service.form.nextDueHint')}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t('service.form.nextDueOn')} error={errors.nextDueOn?.message}>
                {({ id, invalid }) => (
                  <Controller
                    control={control}
                    name="nextDueOn"
                    render={({ field }) => (
                      <DatePicker
                        id={id}
                        aria-label={t('service.form.nextDueOn')}
                        value={field.value}
                        onChange={field.onChange}
                        invalid={invalid}
                        placeholder={t('service.form.nextDuePlaceholder')}
                      />
                    )}
                  />
                )}
              </FormField>

              <FormField
                label={t('service.form.nextDueOdometer')}
                error={errors.nextDueOdometer?.message}
              >
                {({ id, invalid }) => (
                  <Input id={id} type="number" min={0} aria-invalid={invalid} {...register('nextDueOdometer', { setValueAs: (v) => (v === '' ? '' : Number(v)) })} />
                )}
              </FormField>
            </div>
          </div>

          <FormField label={t('service.form.vendor')} error={errors.vendor?.message}>
            {({ id, invalid }) => (
              <Input id={id} aria-invalid={invalid} placeholder={t('service.form.vendorPlaceholder')} {...register('vendor')} />
            )}
          </FormField>

          <FormField label={t('service.form.notes')} error={errors.notes?.message}>
            {({ id, invalid }) => <Textarea id={id} rows={3} aria-invalid={invalid} {...register('notes')} />}
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('service.form.cancel')}
            </Button>
            <Button type="submit" loading={pending}>
              {record ? t('service.form.save') : t('service.form.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
