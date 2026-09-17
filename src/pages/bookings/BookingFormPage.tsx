import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CalendarClock, UserRoundPlus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Combobox } from '@/components/ui/combobox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { FormField } from '@/components/forms/FormField'
import { Stepper, type StepDef } from '@/components/forms/Stepper'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useFormatters } from '@/i18n'
import { LOCATIONS } from '@/modules/locations/mock/location.mock'
import { CUSTOMERS } from '@/modules/customers/mock/customer.mock'
import { ReviewRow, ReviewRowGrid, ReviewSection } from '@/modules/vehicles/components/ReviewSummary'
import { useVehicles } from '@/modules/vehicles/hooks/use-vehicles'
import type { RateOption, Vehicle } from '@/modules/vehicles/types/vehicle.types'
import { vehicleDisplayName } from '@/modules/vehicles/utils/vehicle.utils'
import { BookingExtrasPicker } from '@/modules/bookings/components/BookingExtrasPicker'
import { BookingPriceSummary } from '@/modules/bookings/components/BookingPriceSummary'
import { BookingRateOptions } from '@/modules/bookings/components/BookingRateOptions'
import { BookingVehiclePicker } from '@/modules/bookings/components/BookingVehiclePicker'
import { useCreateBooking } from '@/modules/bookings/hooks/use-bookings'
import {
  BOOKING_STEP_FIELDS,
  bookingFormSchema,
  combineDateTime,
  type BookingFormValues,
} from '@/modules/bookings/schema/booking.schema'
import type { BookingInput } from '@/modules/bookings/types/booking.types'
import { durationHours, priceBooking } from '@/modules/bookings/utils/booking.pricing'
import { formatRentalWindow } from '@/modules/bookings/utils/booking.utils'

const STEP_KEYS = ['trip', 'vehicle', 'customer', 'review'] as const

/** A generous single page — the fleet is small enough to pick from without server-side paging. */
const FLEET_PAGE_SIZE = 200

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** `<input type="date">` wants YYYY-MM-DD in *local* time — toISOString() would shift the day. */
function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/** Tomorrow to three days later, 10:00 both ends — the most common counter booking. */
function defaultValues(): BookingFormValues {
  const today = new Date()
  return {
    pickupLocation: '',
    returnLocation: '',
    pickupDate: toDateInput(addDays(today, 1)),
    pickupTime: '10:00',
    returnDate: toDateInput(addDays(today, 4)),
    returnTime: '10:00',
    vehicleId: '',
    rateOptionId: '',
    extras: [],
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerLicence: '',
    notes: '',
  }
}

export function BookingFormPage() {
  const { t } = useTranslation('bookings')
  const { t: tCommon } = useTranslation('common')
  const { t: tValidation } = useTranslation('validation')
  const format = useFormatters()
  const navigate = useNavigate()
  const createBooking = useCreateBooking()

  const [stepIndex, setStepIndex] = useState(0)
  const [furthestIndex, setFurthestIndex] = useState(0)

  const steps: StepDef[] = STEP_KEYS.map((key) => ({ key, label: t(`form.steps.${key}`) }))

  // `tValidation` is re-created on language change, so the schema (and its messages) follow.
  const schema = useMemo(() => bookingFormSchema(tValidation), [tValidation])

  const {
    control,
    register,
    handleSubmit,
    trigger,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormValues>({ resolver: zodResolver(schema), defaultValues: defaultValues(), mode: 'onChange' })

  const values = useWatch({ control }) as BookingFormValues
  const stepKey = STEP_KEYS[stepIndex]

  const pickupAt = combineDateTime(values.pickupDate, values.pickupTime).toISOString()
  const returnAt = combineDateTime(values.returnDate, values.returnTime).toISOString()
  const hours = durationHours(pickupAt, returnAt)
  const days = Math.max(1, Math.ceil(hours / 24))

  // Only vehicles that can actually be rented: published, Available, and sitting at the pickup
  // branch. Before a location is chosen the whole available fleet is shown.
  const { data, isLoading, isError, refetch } = useVehicles({
    status: 'Available',
    location: values.pickupLocation || 'All',
    isDraft: false,
    page: 1,
    pageSize: FLEET_PAGE_SIZE,
  })

  const vehicles = useMemo(() => data?.items ?? [], [data])
  const selectedVehicle = vehicles.find((v) => v.id === values.vehicleId)
  const selectedOption = selectedVehicle?.rateOptions.find((o) => o.id === values.rateOptionId)

  // Changing the pickup branch can strand a vehicle that is no longer offered — drop the
  // selection rather than silently booking a car from the wrong location.
  useEffect(() => {
    if (!values.vehicleId) return
    if (isLoading || vehicles.some((v) => v.id === values.vehicleId)) return
    setValue('vehicleId', '', { shouldValidate: false })
    setValue('rateOptionId', '', { shouldValidate: false })
  }, [vehicles, isLoading, values.vehicleId, setValue])

  const pricing =
    selectedVehicle && selectedOption
      ? priceBooking({
          vehicle: selectedVehicle,
          option: selectedOption,
          pickupAt,
          returnAt,
          extras: values.extras,
        })
      : null

  const goNext = async () => {
    const fields = BOOKING_STEP_FIELDS[stepKey]
    const valid = fields.length === 0 ? true : await trigger(fields as (keyof BookingFormValues)[])
    if (!valid) return
    const next = Math.min(stepIndex + 1, STEP_KEYS.length - 1)
    setStepIndex(next)
    setFurthestIndex((f) => Math.max(f, next))
  }

  const goPrev = () => setStepIndex((i) => Math.max(i - 1, 0))

  function handleSelectVehicle(vehicle: Vehicle) {
    setValue('vehicleId', vehicle.id, { shouldValidate: true })
    // Default to the daily rate when there is one — the option most bookings use.
    const preferred = vehicle.rateOptions.find((o) => o.basis === 'day') ?? vehicle.rateOptions[0]
    setValue('rateOptionId', preferred?.id ?? '', { shouldValidate: true })
  }

  function handleSelectRate(option: RateOption) {
    setValue('rateOptionId', option.id, { shouldValidate: true })
  }

  /** Prefills the contact fields from the customer book — they stay editable afterwards. */
  function handlePickCustomer(name: string) {
    const match = CUSTOMERS.find((c) => c[0] === name)
    const opts = { shouldValidate: true, shouldDirty: true } as const
    setValue('customerName', name, opts)
    if (!match) return
    setValue('customerEmail', match[1], opts)
    setValue('customerPhone', match[2], opts)
    setValue('customerLicence', match[3], opts)
  }

  const onSubmit = (submitted: BookingFormValues) => {
    if (!selectedVehicle || !selectedOption || !pricing) return

    const input: BookingInput = {
      customer: {
        name: submitted.customerName,
        email: submitted.customerEmail,
        phone: submitted.customerPhone,
        licence: submitted.customerLicence,
      },
      vehicleId: selectedVehicle.id,
      rateOptionId: selectedOption.id,
      vehicleName: vehicleDisplayName(selectedVehicle),
      vehiclePlate: selectedVehicle.plate,
      pickupLocation: submitted.pickupLocation,
      returnLocation: submitted.returnLocation,
      pickupAt: combineDateTime(submitted.pickupDate, submitted.pickupTime).toISOString(),
      returnAt: combineDateTime(submitted.returnDate, submitted.returnTime).toISOString(),
      extras: submitted.extras,
      notes: submitted.notes || undefined,
      total: pricing.total,
    }

    createBooking.mutate(input, { onSuccess: () => navigate('/app/bookings') })
  }

  return (
    <PageContainer>
      <PageHeader title={t('form.title')} description={t('form.description')} />

      <Card as="section" className="p-[18px]">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <Stepper
            steps={steps}
            currentIndex={stepIndex}
            furthestIndex={furthestIndex}
            onStepClick={(i) => setStepIndex(i)}
            ariaLabel={t('form.stepsLabel')}
          />
        </div>

        <form
          className="flex flex-col gap-5"
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && stepKey !== 'review' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
              e.preventDefault()
            }
          }}
          noValidate
        >
          {stepKey === 'trip' && (
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-meta text-fg-3 mb-3">{t('form.sections.pickup')}</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label={t('form.fields.pickupLocation')} error={errors.pickupLocation?.message} required>
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="pickupLocation"
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={(next) => {
                              field.onChange(next)
                              // Same-branch return is overwhelmingly the norm — seed it, keep it editable.
                              if (!values.returnLocation) setValue('returnLocation', next, { shouldValidate: true })
                            }}
                          >
                            <SelectTrigger id={id} aria-invalid={Boolean(errors.pickupLocation)}>
                              <SelectValue placeholder={t('form.fields.locationPlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                              {LOCATIONS.map((l) => (
                                <SelectItem key={l.name} value={l.name}>
                                  {l.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    )}
                  </FormField>
                  <FormField label={t('form.fields.pickupDate')} error={errors.pickupDate?.message} required>
                    {(fieldProps) => <Input type="date" {...register('pickupDate')} {...fieldProps} />}
                  </FormField>
                  <FormField label={t('form.fields.pickupTime')} error={errors.pickupTime?.message} required>
                    {(fieldProps) => <Input type="time" {...register('pickupTime')} {...fieldProps} />}
                  </FormField>
                </div>
              </div>

              <div className="border-border-soft border-t pt-5">
                <p className="text-meta text-fg-3 mb-3">{t('form.sections.return')}</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label={t('form.fields.returnLocation')} error={errors.returnLocation?.message} required>
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="returnLocation"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id={id} aria-invalid={Boolean(errors.returnLocation)}>
                              <SelectValue placeholder={t('form.fields.locationPlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                              {LOCATIONS.map((l) => (
                                <SelectItem key={l.name} value={l.name}>
                                  {l.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    )}
                  </FormField>
                  <FormField label={t('form.fields.returnDate')} error={errors.returnDate?.message} required>
                    {(fieldProps) => <Input type="date" {...register('returnDate')} {...fieldProps} />}
                  </FormField>
                  <FormField label={t('form.fields.returnTime')} error={errors.returnTime?.message} required>
                    {(fieldProps) => <Input type="time" {...register('returnTime')} {...fieldProps} />}
                  </FormField>
                </div>
              </div>

              {hours > 0 && (
                <div className="border-border-strong bg-surface-2 flex flex-wrap items-center gap-2 rounded-[9px] border border-dashed p-3.5">
                  <CalendarClock className="text-fg-4 size-4 shrink-0" aria-hidden />
                  <span className="text-[13px] font-semibold">{formatRentalWindow(pickupAt, returnAt)}</span>
                  <span className="text-fg-4 text-[12.5px]">
                    {t('form.trip.duration', { count: days, hours: Math.round(hours) })}
                  </span>
                </div>
              )}
            </div>
          )}

          {stepKey === 'vehicle' && (
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
              <div className="flex min-w-0 flex-col gap-6">
                <div>
                  <p className="text-meta text-fg-3 mb-1">{t('form.sections.vehicle')}</p>
                  <p className="text-fg-4 mb-3.5 text-[12.5px]">
                    {t('form.vehicle.hint', { location: values.pickupLocation })}
                  </p>
                  {isLoading && !data ? (
                    <LoadingState label={t('form.vehicle.loading')} />
                  ) : isError ? (
                    <ErrorState description={t('form.vehicle.loadError')} onRetry={() => refetch()} />
                  ) : (
                    <>
                      <BookingVehiclePicker
                        vehicles={vehicles}
                        selectedId={values.vehicleId}
                        onSelect={handleSelectVehicle}
                        invalid={Boolean(errors.vehicleId)}
                      />
                      {errors.vehicleId && (
                        <p role="alert" className="text-caption text-error mt-2">
                          {errors.vehicleId.message}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {selectedVehicle && (
                  <div className="border-border-soft border-t pt-5">
                    <p className="text-meta text-fg-3 mb-1">{t('form.sections.rate')}</p>
                    <p className="text-fg-4 mb-3.5 text-[12.5px]">{t('form.rate.hint')}</p>
                    <BookingRateOptions
                      options={selectedVehicle.rateOptions}
                      selectedId={values.rateOptionId}
                      onSelect={handleSelectRate}
                      hours={hours}
                      invalid={Boolean(errors.rateOptionId)}
                    />
                    {errors.rateOptionId && (
                      <p role="alert" className="text-caption text-error mt-2">
                        {errors.rateOptionId.message}
                      </p>
                    )}
                  </div>
                )}

                <div className="border-border-soft border-t pt-5">
                  <p className="text-meta text-fg-3 mb-1">{t('form.sections.extras')}</p>
                  <p className="text-fg-4 mb-3.5 text-[12.5px]">{t('form.extras.hint')}</p>
                  <Controller
                    control={control}
                    name="extras"
                    render={({ field }) => (
                      <BookingExtrasPicker
                        selected={field.value}
                        onChange={field.onChange}
                        days={days}
                      />
                    )}
                  />
                </div>
              </div>

              {pricing && selectedOption && (
                <BookingPriceSummary pricing={pricing} option={selectedOption} className="lg:sticky lg:top-4" />
              )}
            </div>
          )}

          {stepKey === 'customer' && (
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-meta text-fg-3 mb-1">{t('form.sections.customer')}</p>
                <p className="text-fg-4 mb-3.5 text-[12.5px]">{t('form.customer.hint')}</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label={t('form.fields.customerName')} error={errors.customerName?.message} required>
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="customerName"
                        render={({ field }) => (
                          <Combobox
                            id={id}
                            aria-label={t('form.fields.customerName')}
                            value={field.value}
                            onChange={handlePickCustomer}
                            options={CUSTOMERS.map((c) => c[0])}
                            placeholder={t('form.fields.customerNamePlaceholder')}
                            invalid={Boolean(errors.customerName)}
                          />
                        )}
                      />
                    )}
                  </FormField>
                  <FormField label={t('form.fields.customerEmail')} error={errors.customerEmail?.message} required>
                    {(fieldProps) => <Input type="email" {...register('customerEmail')} {...fieldProps} />}
                  </FormField>
                  <FormField label={t('form.fields.customerPhone')} error={errors.customerPhone?.message} required>
                    {(fieldProps) => <Input type="tel" {...register('customerPhone')} {...fieldProps} />}
                  </FormField>
                  <FormField label={t('form.fields.customerLicence')} error={errors.customerLicence?.message} required>
                    {(fieldProps) => <Input className="font-mono" {...register('customerLicence')} {...fieldProps} />}
                  </FormField>
                </div>
                <p className="text-fg-4 mt-3 flex items-center gap-1.5 text-[11.5px]">
                  <UserRoundPlus className="size-3.5 shrink-0" aria-hidden />
                  {t('form.customer.newHint')}
                </p>
              </div>

              <div className="border-border-soft border-t pt-5">
                <FormField label={t('form.fields.notes')} error={errors.notes?.message}>
                  {(fieldProps) => (
                    <div className="flex flex-col gap-2">
                      <Textarea rows={3} placeholder={t('form.fields.notesPlaceholder')} {...register('notes')} {...fieldProps} />
                      {!errors.notes && <p className="text-description">{t('form.fields.notesHint')}</p>}
                    </div>
                  )}
                </FormField>
              </div>
            </div>
          )}

          {stepKey === 'review' && (
            <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-2">
              <div className="flex flex-col gap-3.5">
                <ReviewSection title={t('form.review.trip')} onEdit={() => setStepIndex(0)}>
                  <ReviewRowGrid>
                    <ReviewRow label={t('form.fields.pickupLocation')} value={values.pickupLocation || '—'} />
                    <ReviewRow
                      label={t('form.fields.pickupDate')}
                      value={format.date(pickupAt, { dateStyle: 'medium', timeStyle: 'short' })}
                    />
                    <ReviewRow label={t('form.fields.returnLocation')} value={values.returnLocation || '—'} />
                    <ReviewRow
                      label={t('form.fields.returnDate')}
                      value={format.date(returnAt, { dateStyle: 'medium', timeStyle: 'short' })}
                    />
                    <ReviewRow label={t('form.review.duration')} value={t('form.trip.duration', { count: days, hours: Math.round(hours) })} />
                  </ReviewRowGrid>
                </ReviewSection>

                <ReviewSection title={t('form.review.vehicle')} onEdit={() => setStepIndex(1)}>
                  {selectedVehicle ? (
                    <ReviewRowGrid>
                      <ReviewRow label={t('form.review.vehicleName')} value={vehicleDisplayName(selectedVehicle)} />
                      <ReviewRow label={t('form.review.plate')} value={selectedVehicle.plate} />
                      <ReviewRow label={t('form.review.rate')} value={selectedOption?.label ?? '—'} />
                    </ReviewRowGrid>
                  ) : (
                    <p className="text-fg-4 text-[13px]">{t('form.review.noVehicle')}</p>
                  )}
                </ReviewSection>

                <ReviewSection title={t('form.review.extras')} count={values.extras.length} onEdit={() => setStepIndex(1)}>
                  {values.extras.length > 0 ? (
                    <ul className="flex flex-col gap-1.5">
                      {values.extras.map((key) => (
                        <li key={key} className="text-fg-2 text-[13px]">
                          {t(`extras.${key}.label`)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-fg-4 text-[13px]">{t('form.review.noExtras')}</p>
                  )}
                </ReviewSection>

                <ReviewSection title={t('form.review.customer')} onEdit={() => setStepIndex(2)}>
                  <ReviewRowGrid>
                    <ReviewRow label={t('form.fields.customerName')} value={values.customerName || '—'} />
                    <ReviewRow label={t('form.fields.customerEmail')} value={values.customerEmail || '—'} />
                    <ReviewRow label={t('form.fields.customerPhone')} value={values.customerPhone || '—'} />
                    <ReviewRow label={t('form.fields.customerLicence')} value={values.customerLicence || '—'} />
                  </ReviewRowGrid>
                  {values.notes && <p className="text-fg-2 mt-3 text-[13px]" style={{ textWrap: 'pretty' }}>{values.notes}</p>}
                </ReviewSection>
              </div>

              <div className="flex flex-col gap-3.5">
                {pricing && selectedOption ? (
                  <BookingPriceSummary pricing={pricing} option={selectedOption} />
                ) : (
                  <ReviewSection title={t('form.summary.title')} onEdit={() => setStepIndex(1)}>
                    <p className="text-fg-4 text-[13px]">{t('form.review.noVehicle')}</p>
                  </ReviewSection>
                )}
              </div>
            </div>
          )}

          <div className="border-border-soft flex flex-wrap items-center justify-end gap-2.5 border-t pt-4">
            {stepIndex > 0 && (
              <Button type="button" variant="outline" onClick={goPrev}>
                {t('form.nav.previousStep')}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => navigate('/app/bookings')}>
              {tCommon('actions.cancel')}
            </Button>
            {stepKey !== 'review' ? (
              <Button type="button" onClick={goNext}>
                {t('form.nav.nextStep')}
              </Button>
            ) : (
              <Button
                type="button"
                loading={isSubmitting || createBooking.isPending}
                disabled={!pricing}
                onClick={handleSubmit(onSubmit)}
                className="gap-1.5"
              >
                {t('form.nav.create')}
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            )}
          </div>
        </form>
      </Card>
    </PageContainer>
  )
}
