import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DocumentUpload } from '@/components/forms/DocumentUpload'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDebounced } from '@/lib/use-debounced'
import { toDateInput } from '@/modules/bookings/utils/booking.trip-defaults'
import { ACCEPTED_DOCUMENT_TYPES } from '../api/customer-document.api'
import { toCustomerConflict } from '../api/customer.mapper'
import { DOB_YEAR_RANGE } from '../constants/customer.constants'
import { useCustomerMatches, useSaveCustomer } from '../hooks/use-customers'
import {
  customerFormValues,
  customerSchema,
  pickedDocuments,
  toCustomerInput,
  type CustomerFormValues,
} from '../schema/customer.schema'
import { GENDERS, type Customer, type CustomerConflict } from '../types/customer.types'
import { CustomerConflictDialog } from './CustomerConflictDialog'
import { CustomerOnFile } from './CustomerOnFile'

interface Props {
  /** Absent when adding; present when editing. */
  customer?: Customer
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomerFormDialog({ customer, open, onOpenChange }: Props) {
  const { t } = useTranslation('customers')
  const { t: tCommon } = useTranslation('common')
  const { t: tValidation } = useTranslation('validation')
  const navigate = useNavigate()
  const save = useSaveCustomer()
  const [conflict, setConflict] = useState<CustomerConflict>()

  const schema = useMemo(() => customerSchema(tValidation), [tValidation])
  const {
    control,
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: customerFormValues(customer),
  })

  useEffect(() => {
    if (open) reset(customerFormValues(customer))
  }, [open, customer, reset])

  // Asked as the renter is typed, so the counter sees who is on file before saving rather
  // than in the refusal afterwards.
  const typed = useWatch({ control })
  const matchInput = useDebounced(
    useMemo(
      () => ({
        name: typed.name,
        email: typed.email,
        phone: typed.phone,
        dateOfBirth: typed.dateOfBirth,
        licenceNumber: typed.licenceNumber,
        excludeId: customer?.id,
      }),
      [typed.name, typed.email, typed.phone, typed.dateOfBirth, typed.licenceNumber, customer?.id],
    ),
  )
  const { data: matches = [] } = useCustomerMatches(matchInput)

  function openCustomer(id: string) {
    setConflict(undefined)
    onOpenChange(false)
    navigate(`/customers/${id}`)
  }

  function submit(values: CustomerFormValues, allowSharedLicence = false) {
    save.mutate(
      {
        id: customer?.id,
        input: toCustomerInput(values),
        allowSharedLicence,
        documents: pickedDocuments(values),
      },
      {
        onSuccess: () => {
          setConflict(undefined)
          onOpenChange(false)
        },
        onError: (error) => setConflict(toCustomerConflict(error)),
      },
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{customer ? t('form.editTitle') : t('form.addTitle')}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit((values) => submit(values))} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label={t('form.name')}
                required
                error={errors.name?.message}
                className="sm:col-span-2"
              >
                {(fieldProps) => <Input {...register('name')} {...fieldProps} />}
              </FormField>
              <FormField label={t('form.email')} required error={errors.email?.message}>
                {(fieldProps) => <Input type="email" {...register('email')} {...fieldProps} />}
              </FormField>
              <FormField label={t('form.phone')} required error={errors.phone?.message}>
                {(fieldProps) => <Input type="tel" {...register('phone')} {...fieldProps} />}
              </FormField>
              <FormField label={t('form.gender')} required error={errors.gender?.message}>
                {({ id, invalid }) => (
                  <Controller
                    control={control}
                    name="gender"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id={id} aria-invalid={invalid}>
                          <SelectValue placeholder={t('form.genderPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {GENDERS.map((gender) => (
                            <SelectItem key={gender} value={gender}>
                              {t(`gender.${gender}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </FormField>
              <FormField label={t('form.dateOfBirth')} required error={errors.dateOfBirth?.message}>
                {({ id, invalid }) => (
                  <Controller
                    control={control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <DatePicker
                        id={id}
                        aria-label={t('form.dateOfBirth')}
                        value={field.value}
                        onChange={field.onChange}
                        max={toDateInput(new Date())}
                        yearRange={DOB_YEAR_RANGE}
                        placeholder={t('form.datePlaceholder')}
                        invalid={invalid}
                      />
                    )}
                  />
                )}
              </FormField>
              <FormField
                label={t('form.address')}
                required
                error={errors.address?.message}
                className="sm:col-span-2"
              >
                {(fieldProps) => <Input {...register('address')} {...fieldProps} />}
              </FormField>
              <FormField label={t('form.licenceNumber')} required error={errors.licenceNumber?.message}>
                {(fieldProps) => (
                  <Input className="font-mono" {...register('licenceNumber')} {...fieldProps} />
                )}
              </FormField>
              <FormField label={t('form.licenceExpiry')} error={errors.licenceExpiry?.message}>
                {({ id, invalid }) => (
                  <Controller
                    control={control}
                    name="licenceExpiry"
                    render={({ field }) => (
                      <DatePicker
                        id={id}
                        aria-label={t('form.licenceExpiry')}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t('form.datePlaceholder')}
                        invalid={invalid}
                      />
                    )}
                  />
                )}
              </FormField>
              {/* Only when adding: an existing customer's scans are managed on their page. */}
              {!customer &&
                (['licence', 'insurance'] as const).map((kind) => (
                  <FormField
                    key={kind}
                    label={t(`form.${kind}Document`)}
                    description={t(`form.${kind}DocumentHint`)}
                  >
                    {({ id }) => (
                      <Controller
                        control={control}
                        name={`${kind}Document`}
                        render={({ field }) => (
                          <DocumentUpload
                            id={id}
                            label={t(`form.${kind}Document`)}
                            value={field.value}
                            onChange={field.onChange}
                            accept={ACCEPTED_DOCUMENT_TYPES.join(',')}
                          />
                        )}
                      />
                    )}
                  </FormField>
                ))}
            </div>

            {matches.length > 0 && (
              <section aria-label={t('form.matchesTitle')} className="flex flex-col gap-2">
                <p className="m-0 text-[13px] font-medium">{t('form.matchesTitle')}</p>
                <p className="text-fg-3 m-0 text-caption">{t('form.matchesHint')}</p>
                {matches.map(({ customer: match, reasons }) => (
                  <CustomerOnFile
                    key={match.id}
                    customer={match}
                    reasons={reasons}
                    action={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openCustomer(match.id)}
                      >
                        {t('form.openCustomer')}
                      </Button>
                    }
                  />
                ))}
              </section>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {tCommon('actions.cancel')}
              </Button>
              <Button type="submit" loading={save.isPending && !conflict}>
                {customer ? tCommon('actions.saveChanges') : t('form.add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CustomerConflictDialog
        conflict={conflict}
        onClose={() => setConflict(undefined)}
        sameLabel={t('form.openCustomer')}
        onSame={(onFile) => openCustomer(onFile.id)}
        onDifferent={() => submit(getValues(), true)}
        pending={save.isPending}
      />
    </>
  )
}
