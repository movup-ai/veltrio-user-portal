import { useEffect, useMemo, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, CheckCircle2, CircleSlash, Paperclip, Save, UserPlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Combobox } from '@/components/ui/combobox'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { DocumentUpload } from '@/components/forms/DocumentUpload'
import { FormField } from '@/components/forms/FormField'
import { StepSidebar } from '@/components/forms/StepSidebar'
import type { StepDef } from '@/components/forms/Stepper'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { useFormatters } from '@/i18n'
import { LOCATIONS } from '@/modules/locations/mock/location.mock'
import { CUSTOMERS } from '@/modules/customers/mock/customer.mock'
import { ReviewRow, ReviewRowGrid, ReviewSection } from '@/modules/vehicles/components/ReviewSummary'
import { useVehicles } from '@/modules/vehicles/hooks/use-vehicles'
import type { RateOption, Vehicle } from '@/modules/vehicles/types/vehicle.types'
import { formatRateOptionPrice, vehicleDisplayName } from '@/modules/vehicles/utils/vehicle.utils'
import { AdditionalDriversEditor } from '@/modules/bookings/components/AdditionalDriversEditor'
import { BookingFeesEditor } from '@/modules/bookings/components/BookingFeesEditor'
import { BookingVerificationPicker } from '@/modules/bookings/components/BookingVerificationPicker'
import { BookingPriceSummary } from '@/modules/bookings/components/BookingPriceSummary'
import { BookingRateOptions } from '@/modules/bookings/components/BookingRateOptions'
import { BookingVehiclePicker, type VehicleOption } from '@/modules/bookings/components/BookingVehiclePicker'
import { useBookings, useCreateBooking } from '@/modules/bookings/hooks/use-bookings'
import { conflictsForPlate } from '@/modules/bookings/utils/booking.schedule'
import {
  BOOKING_STEP_FIELDS,
  bookingFormSchema,
  combineDateTime,
  type BookingFormValues,
} from '@/modules/bookings/schema/booking.schema'
import type { BookedInterval, BookingInput } from '@/modules/bookings/types/booking.types'
import { durationHours, priceBooking, rentalDays } from '@/modules/bookings/utils/booking.pricing'

const STEP_KEYS = ['trip', 'renter', 'pricing', 'review'] as const
type StepKey = (typeof STEP_KEYS)[number]

/** A generous single page — the fleet is small enough to pick from without server-side paging. */
const FLEET_PAGE_SIZE = 200

const DRAFT_STORAGE_KEY = 'veltrio.bookingDraft'

/** Stable empty default so an unresolved bookings query doesn't churn identity every render. */
const EMPTY_SCHEDULE: BookedInterval[] = []

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

const TODAY_INPUT = toDateInput(new Date())

/** Wide enough for any adult renter — the DOB picker pages by dropdown, not month by month. */
const DOB_YEAR_RANGE = { from: new Date().getFullYear() - 100, to: new Date().getFullYear() }

/** Tomorrow to four days later, 09:30 both ends — the most common counter booking. */
function blankValues(): BookingFormValues {
  const today = new Date()
  return {
    pickupLocation: '',
    returnLocation: '',
    pickupDate: toDateInput(addDays(today, 1)),
    pickupTime: '09:30',
    returnDate: toDateInput(addDays(today, 5)),
    returnTime: '09:30',
    vehicleId: '',
    customerId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerDob: '',
    customerAddress: '',
    licenceNumber: '',
    licenceExpiry: '',
    licenceDocument: null,
    insuranceDocument: null,
    verifications: ['identity'],
    additionalDrivers: [],
    rateOptionId: '',
    fees: [],
  }
}

/** A saved draft may predate a field being added — merge it over a blank form rather than trusting it wholesale. */
function loadDraft(): BookingFormValues | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) return null
    return { ...blankValues(), ...(JSON.parse(raw) as Partial<BookingFormValues>) }
  } catch {
    return null
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
  const [restoredDraft] = useState(loadDraft)

  /**
   * The lookup box holds its own text, deliberately *not* bound to `customerName`. Sharing one
   * value made the two fields mirror each other, so typing a new renter's name below echoed
   * into the search above. Seeded only when a draft was linked to a real customer.
   */
  const [customerQuery, setCustomerQuery] = useState(restoredDraft?.customerId ? restoredDraft.customerName : '')

  const [returnElsewhere, setReturnElsewhere] = useState(
    Boolean(restoredDraft && restoredDraft.returnLocation && restoredDraft.returnLocation !== restoredDraft.pickupLocation),
  )

  const steps: StepDef[] = STEP_KEYS.map((key) => ({
    key,
    label: t(`form.steps.${key}.label`),
    description: t(`form.steps.${key}.description`),
  }))

  // `tValidation` is re-created on language change, so the schema (and its messages) follow.
  const schema = useMemo(() => bookingFormSchema(tValidation), [tValidation])

  const {
    control,
    register,
    handleSubmit,
    trigger,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: restoredDraft ?? blankValues(),
    mode: 'onChange',
  })

  const values = useWatch({ control }) as BookingFormValues
  const stepKey: StepKey = STEP_KEYS[stepIndex]

  // Ref-guarded: StrictMode runs mount effects twice in dev, which would double the toast.
  const draftNotified = useRef(false)
  useEffect(() => {
    if (!restoredDraft || draftNotified.current) return
    draftNotified.current = true
    toast({ title: t('form.draft.restored'), description: t('form.draft.restoredDescription') })
  }, [restoredDraft, t])

  const pickupAt = combineDateTime(values.pickupDate, values.pickupTime).toISOString()
  const returnAt = combineDateTime(values.returnDate, values.returnTime).toISOString()
  const hours = durationHours(pickupAt, returnAt)
  const days = rentalDays(hours)

  // Only vehicles that can actually be rented: published, Available, and sitting at the pickup
  // branch. Before a location is chosen the whole available fleet is shown.
  const { data, isLoading, isError, refetch } = useVehicles({
    status: 'Available',
    location: values.pickupLocation || 'All',
    // Drafts are a separate resource now, so the vehicles list never includes them.
    page: 1,
    pageSize: FLEET_PAGE_SIZE,
  })

  const { data: bookingLists } = useBookings()
  const schedule = bookingLists?.schedule ?? EMPTY_SCHEDULE

  /**
   * Every vehicle at the branch, each tagged with the rental that blocks it (if any). An
   * unparseable or reversed date range can't be checked against, so nothing is marked blocked
   * until the window is real.
   *
   * Derived straight through rather than memoized: it's a handful of vehicles against a
   * handful of intervals, and keeping the arrays out of any dependency list is what lets the
   * reset effect below key off a boolean instead of an array identity.
   */
  const options: VehicleOption[] = (data?.items ?? []).map((vehicle) => {
    const clash = hours > 0 ? conflictsForPlate(schedule, vehicle.plate, pickupAt, returnAt)[0] : undefined
    return { vehicle, bookedUntil: clash?.to }
  })

  const freeVehicles = options.filter((o) => !o.bookedUntil).map((o) => o.vehicle)
  const selectedVehicle = freeVehicles.find((v) => v.id === values.vehicleId)
  const selectedOption = selectedVehicle?.rateOptions.find((o) => o.id === values.rateOptionId)

  // Changing the branch or the dates can strand the chosen vehicle — drop the selection rather
  // than silently booking a car from the wrong location, or one that's now double-booked.
  const selectionStranded = Boolean(values.vehicleId) && !isLoading && !selectedVehicle
  useEffect(() => {
    if (!selectionStranded) return
    setValue('vehicleId', '', { shouldValidate: false })
    setValue('rateOptionId', '', { shouldValidate: false })
  }, [selectionStranded, setValue])

  const pricing =
    selectedVehicle && selectedOption
      ? priceBooking({
          vehicle: selectedVehicle,
          option: selectedOption,
          pickupAt,
          returnAt,
          additionalDrivers: values.additionalDrivers,
          fees: values.fees,
        })
      : null

  /** Labels of the documents actually attached — drives the chips on the Review step. */
  const attachedDocuments = [
    values.licenceDocument ? t('form.documents.licence') : null,
    values.insuranceDocument ? t('form.documents.insurance') : null,
  ].filter((label) => label != null)

  const goNext = async () => {
    const fields = BOOKING_STEP_FIELDS[stepKey]
    const valid = fields.length === 0 ? true : await trigger(fields as (keyof BookingFormValues)[])
    if (!valid) return
    const next = Math.min(stepIndex + 1, STEP_KEYS.length - 1)
    setStepIndex(next)
    setFurthestIndex((f) => Math.max(f, next))
  }

  const goPrev = () => setStepIndex((i) => Math.max(i - 1, 0))

  const cancel = () => navigate('/app/bookings')

  function handleSaveDraft() {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(values))
    toast({ title: t('form.draft.saved'), description: t('form.draft.savedDescription'), variant: 'success' })
    navigate('/app/bookings')
  }

  function handleSelectVehicle(vehicle: Vehicle) {
    setValue('vehicleId', vehicle.id, { shouldValidate: true })
    // Default to the daily rate when there is one — the option most bookings use.
    const preferred = vehicle.rateOptions.find((o) => o.basis === 'day') ?? vehicle.rateOptions[0]
    setValue('rateOptionId', preferred?.id ?? '', { shouldValidate: true })
  }

  function handleSelectRate(option: RateOption) {
    setValue('rateOptionId', option.id, { shouldValidate: true })
  }

  function handlePickCustomer(name: string) {
    const match = CUSTOMERS.find((c) => c[0] === name)
    const opts = { shouldValidate: true, shouldDirty: true } as const
    setCustomerQuery(name)
    setValue('customerName', name, opts)
    setValue('customerId', match ? name : '', opts)
    if (!match) return
    setValue('customerEmail', match[1], opts)
    setValue('customerPhone', match[2], opts)
    setValue('licenceNumber', match[3], opts)
  }

  /** Clears a prefilled renter so the next one is typed from scratch rather than edited over. */
  function handleNewCustomer() {
    setCustomerQuery('')
    const fields = [
      'customerId',
      'customerName',
      'customerEmail',
      'customerPhone',
      'customerDob',
      'customerAddress',
      'licenceNumber',
      'licenceExpiry',
    ] as const
    for (const field of fields) setValue(field, '', { shouldValidate: false })
  }

  const onSubmit = (submitted: BookingFormValues) => {
    if (!selectedVehicle || !selectedOption || !pricing) return

    const input: BookingInput = {
      customer: {
        id: submitted.customerId || undefined,
        name: submitted.customerName,
        email: submitted.customerEmail,
        phone: submitted.customerPhone,
        dateOfBirth: submitted.customerDob || undefined,
        address: submitted.customerAddress || undefined,
        licenceNumber: submitted.licenceNumber,
        licenceExpiry: submitted.licenceExpiry || undefined,
        licenceDocument: submitted.licenceDocument ?? undefined,
        insuranceDocument: submitted.insuranceDocument ?? undefined,
      },
      vehicleId: selectedVehicle.id,
      rateOptionId: selectedOption.id,
      vehicleName: vehicleDisplayName(selectedVehicle),
      vehiclePlate: selectedVehicle.plate,
      pickupLocation: submitted.pickupLocation,
      returnLocation: submitted.returnLocation,
      pickupAt: combineDateTime(submitted.pickupDate, submitted.pickupTime).toISOString(),
      returnAt: combineDateTime(submitted.returnDate, submitted.returnTime).toISOString(),
      additionalDrivers: submitted.additionalDrivers,
      fees: submitted.fees,
      verifications: submitted.verifications,
      total: pricing.total,
    }

    createBooking.mutate(input, {
      onSuccess: () => {
        localStorage.removeItem(DRAFT_STORAGE_KEY)
        navigate('/app/bookings')
      },
    })
  }

  return (
    <PageContainer>
      <PageHeader
        title={t('form.title')}
        description={t('form.stepCounter', {
          current: stepIndex + 1,
          total: STEP_KEYS.length,
          label: t(`form.steps.${stepKey}.label`),
        })}
      />

      {/* 260px keeps each step's description on one line, so the four rows stay even in height. */}
      <div className="grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <StepSidebar
          steps={steps}
          currentIndex={stepIndex}
          furthestIndex={furthestIndex}
          onStepClick={setStepIndex}
          ariaLabel={t('form.stepsLabel')}
          className="lg:sticky lg:top-4"
        />

        <form
          className="flex min-w-0 flex-col gap-4"
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && stepKey !== 'review' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
              e.preventDefault()
            }
          }}
          noValidate
        >
          {stepKey === 'trip' && (
            <>
              <Card as="section" className="p-[18px]">
                <PanelHeading title={t('form.sections.trip')} description={t('form.sections.tripHint')} />

                <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2.5">
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
                                // The return branch only diverges on request — otherwise it tracks pickup.
                                if (!returnElsewhere) setValue('returnLocation', next, { shouldValidate: true })
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

                    <label className="flex w-fit cursor-pointer items-center gap-2 text-[13.5px] font-semibold select-none">
                      <Checkbox
                        checked={returnElsewhere}
                        onCheckedChange={(checked) => {
                          const on = checked === true
                          setReturnElsewhere(on)
                          // Unticking re-mirrors pickup; ticking clears it so the branch is a deliberate pick.
                          setValue('returnLocation', on ? '' : values.pickupLocation, { shouldValidate: true })
                        }}
                      />
                      {t('form.fields.returnElsewhere')}
                    </label>
                  </div>

                  <FormField label={t('form.fields.returnLocation')} error={errors.returnLocation?.message} required>
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="returnLocation"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange} disabled={!returnElsewhere}>
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

                  {/* Date and time split per side, so each column stays a self-contained pickup/return block. */}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label={t('form.fields.pickupDate')} error={errors.pickupDate?.message} required>
                      {({ id, invalid }) => (
                        <Controller
                          control={control}
                          name="pickupDate"
                          render={({ field }) => (
                            <DatePicker
                              id={id}
                              aria-label={t('form.fields.pickupDate')}
                              value={field.value}
                              onChange={field.onChange}
                              invalid={invalid}
                            />
                          )}
                        />
                      )}
                    </FormField>
                    <FormField label={t('form.fields.pickupTime')} error={errors.pickupTime?.message} required>
                      {({ id, invalid }) => (
                        <Controller
                          control={control}
                          name="pickupTime"
                          render={({ field }) => (
                            <TimePicker
                              id={id}
                              aria-label={t('form.fields.pickupTimeLong')}
                              value={field.value}
                              onChange={field.onChange}
                              invalid={invalid}
                            />
                          )}
                        />
                      )}
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label={t('form.fields.returnDate')} error={errors.returnDate?.message} required>
                      {({ id, invalid }) => (
                        <Controller
                          control={control}
                          name="returnDate"
                          render={({ field }) => (
                            <DatePicker
                              id={id}
                              aria-label={t('form.fields.returnDate')}
                              value={field.value}
                              onChange={field.onChange}
                              // A return before the pickup isn't a real choice — rule it out in
                              // the calendar rather than only rejecting it on Continue.
                              min={values.pickupDate}
                              invalid={invalid}
                            />
                          )}
                        />
                      )}
                    </FormField>
                    <FormField label={t('form.fields.returnTime')} error={errors.returnTime?.message} required>
                      {({ id, invalid }) => (
                        <Controller
                          control={control}
                          name="returnTime"
                          render={({ field }) => (
                            <TimePicker
                              id={id}
                              aria-label={t('form.fields.returnTimeLong')}
                              value={field.value}
                              onChange={field.onChange}
                              invalid={invalid}
                            />
                          )}
                        />
                      )}
                    </FormField>
                  </div>
                </div>
              </Card>

              <Card as="section" className="overflow-hidden">
                <div className="border-border-soft flex flex-wrap items-start justify-between gap-3 border-b px-[18px] py-3.5">
                  <PanelHeading
                    title={t('form.vehicle.title')}
                    description={[
                      hours > 0 ? `${format.shortDate(pickupAt)} – ${format.shortDate(returnAt)}` : null,
                      values.pickupLocation || tCommon('filters.all'),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  />
                  {!isLoading && !isError && (
                    <span
                      className={cn(
                        'flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold',
                        // Zero is a dead end, not a success — don't dress it in the confirming teal.
                        freeVehicles.length > 0 ? 'bg-tint text-primary' : 'bg-surface-3 text-fg-3',
                      )}
                    >
                      {freeVehicles.length > 0 ? (
                        <CheckCircle2 className="size-3.5" aria-hidden />
                      ) : (
                        <CircleSlash className="size-3.5" aria-hidden />
                      )}
                      {t('form.vehicle.availableCount', { count: freeVehicles.length })}
                    </span>
                  )}
                </div>

                {isLoading && !data ? (
                  <div className="p-[18px]">
                    <LoadingState label={t('form.vehicle.loading')} />
                  </div>
                ) : isError ? (
                  <div className="p-[18px]">
                    <ErrorState description={t('form.vehicle.loadError')} onRetry={() => refetch()} />
                  </div>
                ) : (
                  <>
                    <BookingVehiclePicker
                      options={options}
                      selectedId={values.vehicleId}
                      onSelect={handleSelectVehicle}
                      hours={hours}
                      invalid={Boolean(errors.vehicleId)}
                    />
                    {errors.vehicleId && (
                      <p role="alert" className="text-caption text-error px-[18px] pb-3">
                        {errors.vehicleId.message}
                      </p>
                    )}
                  </>
                )}
              </Card>
            </>
          )}

          {stepKey === 'renter' && (
            <>
              <Card as="section" className="p-[18px]">
                <PanelHeading title={t('form.sections.renter')} description={t('form.customer.hint')} />

                {/* No existing/new mode to choose: search the book, or just start typing. The
                    button is a shortcut that clears a prefill, not a separate branch. */}
                <div className="mt-4">
                  {/* Hint sits under the whole row, not inside the field — otherwise it stretches
                      the flex item and drags the button out of line with the input. */}
                  <div className="flex flex-wrap items-end gap-2.5">
                    <FormField label={t('form.customer.search')} className="min-w-[220px] flex-1">
                      {({ id }) => (
                        <Combobox
                          id={id}
                          aria-label={t('form.customer.search')}
                          value={customerQuery}
                          onChange={handlePickCustomer}
                          options={CUSTOMERS.map((c) => c[0])}
                          placeholder={t('form.fields.customerNamePlaceholder')}
                        />
                      )}
                    </FormField>
                    <Button type="button" variant="outline" onClick={handleNewCustomer} className="gap-1.5">
                      <UserPlus className="size-4" aria-hidden />
                      {t('form.customer.new')}
                    </Button>
                  </div>
                  <p className="text-description mt-1.5">{t('form.customer.searchHint')}</p>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
                  <FormField label={t('form.fields.customerName')} error={errors.customerName?.message} required>
                    {(fieldProps) => {
                      const nameField = register('customerName')
                      return (
                        <Input
                          // Explicit: the label's required asterisk otherwise bleeds into the
                          // accessible name, and the driver rows have a "Full name" too.
                          aria-label={t('form.fields.customerName')}
                          {...nameField}
                          {...fieldProps}
                          onChange={(e) => {
                            // Editing the name by hand means this is no longer the record we
                            // prefilled from — drop the link and the stale name in the lookup.
                            // Free-typed search text is left alone; it was never a link.
                            if (values.customerId) {
                              setValue('customerId', '')
                              setCustomerQuery('')
                            }
                            void nameField.onChange(e)
                          }}
                        />
                      )
                    }}
                  </FormField>
                  <FormField label={t('form.fields.customerEmail')} error={errors.customerEmail?.message} required>
                    {(fieldProps) => <Input type="email" {...register('customerEmail')} {...fieldProps} />}
                  </FormField>
                  <FormField label={t('form.fields.customerPhone')} error={errors.customerPhone?.message} required>
                    {(fieldProps) => <Input type="tel" {...register('customerPhone')} {...fieldProps} />}
                  </FormField>
                  <FormField label={t('form.fields.customerDob')} error={errors.customerDob?.message}>
                    {({ id, invalid }) => (
                      <Controller
                        control={control}
                        name="customerDob"
                        render={({ field }) => (
                          <DatePicker
                            id={id}
                            aria-label={t('form.fields.customerDob')}
                            value={field.value}
                            onChange={field.onChange}
                            max={TODAY_INPUT}
                            yearRange={DOB_YEAR_RANGE}
                            placeholder={t('form.fields.customerDobPlaceholder')}
                            invalid={invalid}
                          />
                        )}
                      />
                    )}
                  </FormField>
                  <FormField
                    label={t('form.fields.customerAddress')}
                    error={errors.customerAddress?.message}
                    className="md:col-span-2"
                  >
                    {(fieldProps) => (
                      <Input placeholder={t('form.fields.customerAddressPlaceholder')} {...register('customerAddress')} {...fieldProps} />
                    )}
                  </FormField>
                </div>
              </Card>

              <Card as="section" className="p-[18px]">
                <PanelHeading title={t('form.sections.documents')} description={t('form.documents.hint')} />

                <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
                  <FormField label={t('form.fields.licenceNumber')} error={errors.licenceNumber?.message} required>
                    {(fieldProps) => <Input className="font-mono" {...register('licenceNumber')} {...fieldProps} />}
                  </FormField>
                  <FormField label={t('form.fields.licenceExpiry')} error={errors.licenceExpiry?.message}>
                    {({ id, invalid }) => (
                      <Controller
                        control={control}
                        name="licenceExpiry"
                        render={({ field }) => (
                          <DatePicker
                            id={id}
                            aria-label={t('form.fields.licenceExpiry')}
                            value={field.value}
                            onChange={field.onChange}
                            min={TODAY_INPUT}
                            placeholder={t('form.fields.licenceExpiryPlaceholder')}
                            invalid={invalid}
                          />
                        )}
                      />
                    )}
                  </FormField>

                  <FormField label={t('form.documents.licence')} description={t('form.documents.licenceHint')}>
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="licenceDocument"
                        render={({ field }) => (
                          <DocumentUpload
                            id={id}
                            label={t('form.documents.licence')}
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    )}
                  </FormField>
                  <FormField label={t('form.documents.insurance')} description={t('form.documents.insuranceHint')}>
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="insuranceDocument"
                        render={({ field }) => (
                          <DocumentUpload
                            id={id}
                            label={t('form.documents.insurance')}
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    )}
                  </FormField>
                </div>
              </Card>

              <Card as="section" className="p-[18px]">
                <PanelHeading title={t('form.sections.verification')} description={t('form.verification.hint')} />
                <div className="mt-4">
                  <Controller
                    control={control}
                    name="verifications"
                    render={({ field }) => <BookingVerificationPicker selected={field.value} onChange={field.onChange} />}
                  />
                </div>
              </Card>

            </>
          )}

          {stepKey === 'pricing' && (
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_290px]">
              <div className="flex min-w-0 flex-col gap-4">
                <Card as="section" className="p-[18px]">
                  <PanelHeading title={t('form.sections.rate')} description={t('form.rate.hint')} />
                  <div className="mt-4">
                    {selectedVehicle ? (
                      <BookingRateOptions
                        options={selectedVehicle.rateOptions}
                        selectedId={values.rateOptionId}
                        onSelect={handleSelectRate}
                        hours={hours}
                        invalid={Boolean(errors.rateOptionId)}
                      />
                    ) : (
                      <p className="text-fg-4 text-[14px]">{t('form.review.noVehicle')}</p>
                    )}
                    {errors.rateOptionId && (
                      <p role="alert" className="text-caption text-error mt-2">
                        {errors.rateOptionId.message}
                      </p>
                    )}
                  </div>
                </Card>

                {/* Sits beside the quote rather than on the Renter step, so the breakdown moves
                    the moment a driver is added. */}
                <Card as="section" className="p-[18px]">
                  <PanelHeading title={t('form.sections.drivers')} description={t('form.drivers.hint')} />
                  <div className="mt-4">
                    <Controller
                      control={control}
                      name="additionalDrivers"
                      render={({ field }) => (
                        <AdditionalDriversEditor
                          value={field.value}
                          onChange={field.onChange}
                          errors={errors.additionalDrivers}
                          days={days}
                        />
                      )}
                    />
                  </div>
                </Card>

                <Card as="section" className="p-[18px]">
                  <PanelHeading title={t('form.sections.fees')} description={t('form.fees.hint')} />
                  <div className="mt-4">
                    <Controller
                      control={control}
                      name="fees"
                      render={({ field }) => (
                        <BookingFeesEditor value={field.value} onChange={field.onChange} errors={errors.fees} />
                      )}
                    />
                  </div>
                </Card>
              </div>

              {pricing && selectedOption && (
                <BookingPriceSummary pricing={pricing} option={selectedOption} className="xl:sticky xl:top-4" />
              )}
            </div>
          )}

          {stepKey === 'review' && (
            // Fixed-width price column, matching the Price step — an equal 1fr/1fr split let the
            // summary card stretch to match the (much wider) left column on a big screen, and its
            // justify-between rows ended up with the amount stranded far from its label.
            // Panel widens only once there's room to spare: at 1280–1535 a 400px column would
            // starve the detail cards down to two fields per row.
            <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
              <div className="flex flex-col gap-3.5">
                <ReviewSection title={t('form.review.trip')} onEdit={() => setStepIndex(0)}>
                  <ReviewRowGrid>
                    <ReviewRow label={t('form.fields.pickupLocation')} value={values.pickupLocation || '—'} />
                    <ReviewRow
                      label={t('form.review.pickupAt')}
                      value={format.date(pickupAt, { dateStyle: 'medium', timeStyle: 'short' })}
                    />
                    <ReviewRow label={t('form.fields.returnLocation')} value={values.returnLocation || '—'} />
                    <ReviewRow
                      label={t('form.review.returnAt')}
                      value={format.date(returnAt, { dateStyle: 'medium', timeStyle: 'short' })}
                    />
                  </ReviewRowGrid>
                </ReviewSection>

                <ReviewSection title={t('form.review.vehicle')} onEdit={() => setStepIndex(0)}>
                  {selectedVehicle ? (
                    <ReviewRowGrid>
                      <ReviewRow label={t('form.review.vehicleName')} value={vehicleDisplayName(selectedVehicle)} />
                      <ReviewRow label={t('form.review.plate')} value={selectedVehicle.plate} />
                      {/* The label alone ("Daily") never said what it costs — the rate rides along
                          with it. The run-out total lives in the breakdown panel, not here. */}
                      <ReviewRow
                        label={t('form.review.rate')}
                        value={
                          selectedOption
                            ? t('form.review.rateValue', {
                                label: selectedOption.label,
                                rate: formatRateOptionPrice(selectedOption),
                              })
                            : '—'
                        }
                      />
                    </ReviewRowGrid>
                  ) : (
                    <p className="text-fg-4 text-[14px]">{t('form.review.noVehicle')}</p>
                  )}
                </ReviewSection>

                <ReviewSection title={t('form.review.customer')} onEdit={() => setStepIndex(1)}>
                  {/* Three across, not four — an email needs the extra width to stay on one line. */}
                  <ReviewRowGrid maxColumns={3}>
                    <ReviewRow label={t('form.fields.customerName')} value={values.customerName || '—'} />
                    <ReviewRow label={t('form.fields.customerEmail')} value={values.customerEmail || '—'} />
                    <ReviewRow label={t('form.fields.customerPhone')} value={values.customerPhone || '—'} />
                    <ReviewRow label={t('form.fields.licenceNumber')} value={values.licenceNumber || '—'} />
                    {values.customerDob && (
                      <ReviewRow
                        label={t('form.fields.customerDob')}
                        value={format.date(values.customerDob, { dateStyle: 'medium' })}
                      />
                    )}
                    {values.customerAddress && (
                      <ReviewRow label={t('form.fields.customerAddress')} value={values.customerAddress} />
                    )}
                  </ReviewRowGrid>

                  {/* Rendered only when something is actually attached — an always-present wrapper
                      left its `mt-3` behind as dead space under the last row. */}
                  {attachedDocuments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {attachedDocuments.map((label) => (
                        <span
                          key={label}
                          className="bg-tint text-primary flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold"
                        >
                          <Paperclip className="size-3" aria-hidden />
                          {label}
                        </span>
                      ))}
                    </div>
                  )}

                </ReviewSection>

                <ReviewSection
                  title={t('form.review.verification')}
                  count={values.verifications.length}
                  onEdit={() => setStepIndex(1)}
                >
                  {values.verifications.length > 0 ? (
                    <ul className="flex flex-col gap-1.5">
                      {values.verifications.map((key) => (
                        <li key={key} className="text-fg-2 text-[14px]">
                          {t(`verification.${key}.label`)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-fg-4 text-[14px]">{t('form.review.noVerification')}</p>
                  )}
                </ReviewSection>

                <ReviewSection
                  title={t('form.review.drivers')}
                  count={values.additionalDrivers.length}
                  onEdit={() => setStepIndex(2)}
                >
                  {values.additionalDrivers.length > 0 ? (
                    <ul className="flex flex-col gap-1.5">
                      {values.additionalDrivers.map((driver) => (
                        <li key={driver.id} className="text-fg-2 flex flex-wrap items-baseline justify-between gap-x-2 text-[14px]">
                          <span>
                            <span className="font-semibold">{driver.name || '—'}</span>{' '}
                            <span className="text-fg-4 font-mono text-[13px]">{driver.licenceNumber}</span>
                          </span>
                          <span className="text-fg-4 shrink-0 text-[13px] tabular-nums">
                            {format.currency(driver.pricePerDay)}/day
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-fg-4 text-[14px]">{t('form.review.noDrivers')}</p>
                  )}
                </ReviewSection>

                {values.fees.length > 0 && (
                  <ReviewSection title={t('form.review.fees')} count={values.fees.length} onEdit={() => setStepIndex(2)}>
                    <ul className="flex flex-col gap-1.5">
                      {values.fees.map((fee) => (
                        <li key={fee.id} className="text-fg-2 flex items-baseline justify-between gap-2 text-[14px]">
                          <span>{fee.label || '—'}</span>
                          <span className="text-fg-4 shrink-0 tabular-nums">{format.currency(fee.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </ReviewSection>
                )}
              </div>

              <div className="flex flex-col gap-3.5">
                {pricing && selectedOption ? (
                  <BookingPriceSummary pricing={pricing} option={selectedOption} className="xl:sticky xl:top-4" />
                ) : (
                  <ReviewSection title={t('form.summary.title')} onEdit={() => setStepIndex(2)}>
                    <p className="text-fg-4 text-[14px]">{t('form.review.noVehicle')}</p>
                  </ReviewSection>
                )}
              </div>
            </div>
          )}

          <Card as="section" className="flex flex-wrap items-center gap-3 p-3.5">
            {/* Leaving the wizard sits with the other navigation rather than up in the header. */}
            {/* Compact padding, but the row's full height — a shorter button breaks the baseline. */}
            <Button type="button" variant="outline" size="sm" onClick={cancel} className="text-fg-3 h-9 gap-1.5">
              <X className="size-4" aria-hidden />
              {tCommon('actions.cancel')}
            </Button>

            {stepIndex > 0 && (
              <Button type="button" variant="outline" onClick={goPrev} className="gap-1.5">
                <ArrowLeft className="size-4" aria-hidden />
                {t('form.nav.previousStep')}
              </Button>
            )}

            <div className="flex-1" />

            <Button type="button" variant="outline" onClick={handleSaveDraft} className="gap-1.5">
              <Save className="size-4" aria-hidden />
              {t('form.draft.save')}
            </Button>

            {stepKey !== 'review' ? (
              <Button type="button" onClick={goNext} className="gap-1.5">
                {t('form.nav.continue')}
                <ArrowRight className="size-4" aria-hidden />
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
          </Card>
        </form>
      </div>
    </PageContainer>
  )
}
