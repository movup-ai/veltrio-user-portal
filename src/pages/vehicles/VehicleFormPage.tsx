import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ImageOff, Loader2, ScanLine, Save, Sparkles } from 'lucide-react'
import { useDomainLabels } from '@/i18n/domain'
import { useFormatters } from '@/i18n'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { toast } from '@/components/ui/use-toast'
import { ApiError } from '@/types/api'
import { normalizeApiError } from '@/services/api/errors'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { FormField } from '@/components/forms/FormField'
import { PhotoDropzone } from '@/components/forms/PhotoDropzone'
import { VehiclePhotoEditor } from '@/modules/vehicles/components/VehiclePhotoEditor'
import { RateOptionsEditor } from '@/modules/vehicles/components/RateOptionsEditor'
import { VehicleFeatureChips } from '@/modules/vehicles/components/VehicleFeatureChips'
import { VehicleFeaturesPicker } from '@/modules/vehicles/components/VehicleFeaturesPicker'
import { ReviewRow, ReviewRowGrid, ReviewSection } from '@/modules/vehicles/components/ReviewSummary'
import { Stepper, type StepDef } from '@/components/forms/Stepper'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { useLocationNames } from '@/modules/locations/hooks/use-locations'
import { VEHICLE_COLORS, VEHICLE_MAKES, modelsForMake } from '@/modules/vehicles/data/vehicle-catalog'
import { decodeVin } from '@/modules/vehicles/api/vin-decoder.api'
import { descriptionAiApi, type DescriptionAiAction } from '@/modules/vehicles/api/description-ai.api'
import { STEP_FIELDS, vehicleFormSchema, type VehicleFormValues } from '@/modules/vehicles/schema/vehicle.schema'
import {
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_TYPES,
  SELECTABLE_VEHICLE_STATUSES,
  type VehicleInput,
  type VehiclePhoto,
} from '@/modules/vehicles/types/vehicle.types'
import { useCreateVehicle, useUpdateVehicle, useVehicle } from '@/modules/vehicles/hooks/use-vehicles'
import {
  usePublishVehicleDraft,
  useSaveVehicleDraft,
  useVehicleDrafts,
} from '@/modules/vehicles/hooks/use-vehicle-drafts'
import {
  formatRateOptionBasis,
  formatRateOptionMileage,
  formatRateOptionPrice,
  photoThumbnail,
  valuesFromVehicle,
} from '@/modules/vehicles/utils/vehicle.utils'
import { applyVehicleApiError } from '@/modules/vehicles/utils/vehicle-errors'
import { handOffPhotos } from '@/modules/vehicles/utils/photo-handoff'
import { uploadPhotos } from '@/modules/vehicles/hooks/use-photo-upload'
import { draftTarget, vehicleTarget, type PhotoTarget } from '@/modules/vehicles/api/vehicle-photo.api'

const STEP_KEYS = ['details', 'photos', 'pricing', 'review'] as const
type StepKey = (typeof STEP_KEYS)[number]

/** The form fields a VIN lookup can populate — doubles as the key set under `form.vin.fields`. */
type VinField =
  | 'make'
  | 'model'
  | 'year'
  | 'vehicleType'
  | 'transmission'
  | 'fuelType'
  | 'doors'

const EMPTY_VALUES: VehicleFormValues = {
  make: '',
  model: '',
  year: undefined as unknown as number,
  vehicleType: '' as VehicleFormValues['vehicleType'],
  color: '',
  plate: '',
  vin: '',
  location: '',
  status: 'Available',
  mileage: undefined as unknown as number,
  transmission: 'Automatic',
  fuelType: 'Petrol',
  seats: 5,
  doors: 4,
  features: [],
  description: '',
  photos: [],
  rateOptions: [],
  deposit: undefined as unknown as number,
  overageRatePerMile: undefined as unknown as number,
  fuelChargeRate: undefined,
  taxRatePct: undefined,
}

/**
 * A saved draft can be missing required selects (it was persisted mid-wizard), and an older record
 * may predate a schema change (renamed enum, new required field) — fall back to defaults for any
 * value that no longer matches a known option, same as a brand-new form would use.
 */
function sanitizeFormValues(values: VehicleFormValues): VehicleFormValues {
  return {
    ...EMPTY_VALUES,
    ...values,
    vehicleType: (VEHICLE_TYPES as readonly string[]).includes(values.vehicleType) ? values.vehicleType : EMPTY_VALUES.vehicleType,
    status: (SELECTABLE_VEHICLE_STATUSES as readonly string[]).includes(values.status) ? values.status : EMPTY_VALUES.status,
    transmission: (TRANSMISSIONS as readonly string[]).includes(values.transmission) ? values.transmission : EMPTY_VALUES.transmission,
    fuelType: (FUEL_TYPES as readonly string[]).includes(values.fuelType) ? values.fuelType : EMPTY_VALUES.fuelType,
    location: values.location || EMPTY_VALUES.location,
  }
}

function formValuesToVehicleInput(values: VehicleFormValues): VehicleInput {
  return {
    make: values.make,
    model: values.model,
    year: values.year,
    vehicleType: values.vehicleType,
    color: values.color,
    plate: values.plate,
    vin: values.vin,
    location: values.location,
    status: values.status,
    mileage: values.mileage,
    description: values.description || undefined,
    photos: values.photos,
    features: values.features,
    rateOptions: values.rateOptions,
    fees: {
      deposit: values.deposit,
      overageRatePerMile: values.overageRatePerMile,
      fuelChargeRate: values.fuelChargeRate,
      taxRatePct: values.taxRatePct,
    },
    specs: {
      transmission: values.transmission,
      fuelType: values.fuelType,
      seats: values.seats,
      doors: values.doors,
    },
  }
}

/** RHF's valueAsNumber yields NaN (not undefined) for a cleared numeric input — treat both as "no value". */
function hasValue(n: number | undefined): n is number {
  return n != null && !Number.isNaN(n)
}

export function VehicleFormPage() {
  const { t } = useTranslation('vehicles')
  const { vehicleId } = useParams()
  const [searchParams] = useSearchParams()
  // "Continue editing" from the Drafts tab arrives as /vehicles/new?draft=<id>.
  const draftId = searchParams.get('draft') ?? undefined
  const isEdit = Boolean(vehicleId)

  const { data: vehicle, isLoading, isError, refetch } = useVehicle(vehicleId)
  // Drafts are capped at one page, so the list doubles as the lookup — no per-draft endpoint.
  const { data: draftsData, isLoading: isLoadingDrafts } = useVehicleDrafts()
  const draft = draftId ? draftsData?.items.find((d) => d.id === draftId) : undefined

  if (draftId && isLoadingDrafts) {
    return (
      <PageContainer>
        <LoadingState label={t('details.loading')} />
      </PageContainer>
    )
  }

  if (isEdit && isLoading) {
    return (
      <PageContainer>
        <LoadingState label={t('details.loading')} />
      </PageContainer>
    )
  }

  if (isEdit && (isError || !vehicle)) {
    return (
      <PageContainer>
        <PageHeader title={t('form.editTitle')} description={t('form.subtitle')} />
        <ErrorState description={t('form.loadError')} onRetry={() => refetch()} />
      </PageContainer>
    )
  }

  // A draft is whatever the wizard last held, so it may be missing anything — sanitize before
  // handing it to the form, exactly as for a vehicle that predates a schema change.
  const initialValues = vehicle
    ? sanitizeFormValues(valuesFromVehicle(vehicle))
    : draft
      ? // Photos live on the server against the draft, not in its payload.
        sanitizeFormValues({ ...EMPTY_VALUES, ...draft.payload, photos: draft.photos })
      : EMPTY_VALUES

  return (
    <VehicleForm
      key={vehicle?.id ?? draftId ?? 'new'}
      initialValues={initialValues}
      vehicleId={vehicleId}
      draftId={draftId}
      isEdit={isEdit}
      existingPhotos={vehicle?.photos ?? draft?.photos ?? []}
    />
  )
}

function VehicleForm({
  initialValues,
  vehicleId,
  draftId,
  isEdit,
  existingPhotos,
}: {
  initialValues: VehicleFormValues
  vehicleId?: string
  /** Set when the wizard was reopened from a saved draft — "Save & exit" updates that draft. */
  draftId?: string
  isEdit: boolean
  /** The vehicle's saved photos, managed against the API rather than through form state. */
  existingPhotos: VehiclePhoto[]
}) {
  const { t } = useTranslation('vehicles')
  const { t: tCommon } = useTranslation('common')
  const locations = useLocationNames()
  const { t: tValidation } = useTranslation('validation')
  const domain = useDomainLabels()
  const navigate = useNavigate()
  const createVehicle = useCreateVehicle()
  const updateVehicle = useUpdateVehicle(vehicleId ?? '')
  const saveDraft = useSaveVehicleDraft()
  // No delete hook here: publishing removes the draft server-side, in the same transaction.
  const publishDraft = usePublishVehicleDraft()
  const [stepIndex, setStepIndex] = useState(0)
  const [furthestIndex, setFurthestIndex] = useState(0)
  const [vinToDecode, setVinToDecode] = useState('')
  const [isDecodingVin, setIsDecodingVin] = useState(false)
  const [aiAction, setAiAction] = useState<DescriptionAiAction | null>(null)
  const [stepValidationAttempted, setStepValidationAttempted] = useState<Record<number, boolean>>({})

  const steps: StepDef[] = STEP_KEYS.map((key) => ({ key, label: t(`form.steps.${key}`) }))

  // `tValidation` is re-created on language change, so the schema (and its messages) follow.
  const schema = useMemo(() => vehicleFormSchema(tValidation), [tValidation])

  const {
    control,
    register,
    handleSubmit,
    trigger,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormValues>({ resolver: zodResolver(schema), defaultValues: initialValues, mode: 'onChange' })

  const watchedValues = useWatch({ control }) as VehicleFormValues

  const stepKey = STEP_KEYS[stepIndex]

  const goNext = async () => {
    setStepValidationAttempted((a) => ({ ...a, [stepIndex]: true }))
    const fields = STEP_FIELDS[stepKey as keyof typeof STEP_FIELDS]
    const valid = fields.length === 0 ? true : await trigger(fields as (keyof VehicleFormValues)[])
    if (!valid) return
    const next = Math.min(stepIndex + 1, STEP_KEYS.length - 1)
    setStepIndex(next)
    setFurthestIndex((f) => Math.max(f, next))
  }

  const goPrev = () => setStepIndex((i) => Math.max(i - 1, 0))

  /** Whatever the photos can be attached to right now — nothing, until the wizard is saved. */
  const photoTarget: PhotoTarget | undefined =
    isEdit && vehicleId ? vehicleTarget(vehicleId) : draftId ? draftTarget(draftId) : undefined

  const uploadToDraft = async (id: string, files: File[]) => {
    try {
      const result = await uploadPhotos(draftTarget(id), files)
      if (result.failed > 0) toast({ title: t('photos.uploadFailed'), variant: 'error' })
    } catch (error) {
      toast({ title: t('photos.uploadFailed'), description: normalizeApiError(error).message, variant: 'error' })
    }
  }

  const saveDraftAndExit = () => {
    const onSaved = () => navigate('/app/vehicles')
    if (isEdit && vehicleId) {
      // An already-published vehicle stays published — "Save & exit" just saves what's there.
      updateVehicle.mutate(formValuesToVehicleInput(watchedValues), { onSuccess: onSaved })
    } else {
      // Unvalidated on purpose: a draft isn't a valid vehicle yet. Photos are excluded from
      // the payload — that is JSON capped at 64 KB — and uploaded against the draft instead.
      const { photos, ...persistable } = watchedValues
      const pending = photos.filter((p) => p.file).map((p) => p.file as File)
      saveDraft.mutate(
        { id: draftId, payload: persistable },
        {
          onSuccess: (saved) => {
            // Files picked before the draft existed: now there is an id to upload against.
            // Keyed off the response, since a first save has no draftId until the server assigns one.
            if (pending.length === 0) {
              onSaved()
              return
            }
            void uploadToDraft(saved.id, pending).then(onSaved, onSaved)
          },
        },
      )
    }
  }

  const handleDecodeVin = async () => {
    setIsDecodingVin(true)
    try {
      const decoded = await decodeVin(vinToDecode)
      const filled: string[] = []

      const opts = { shouldDirty: true, shouldValidate: true } as const
      const fieldName = (key: VinField) => t(`form.vin.fields.${key}`)

      if (decoded.make) { setValue('make', decoded.make, opts); filled.push(fieldName('make')) }
      if (decoded.model) { setValue('model', decoded.model, opts); filled.push(fieldName('model')) }
      if (decoded.year) { setValue('year', decoded.year, opts); filled.push(fieldName('year')) }
      if (decoded.vehicleType) { setValue('vehicleType', decoded.vehicleType, opts); filled.push(fieldName('vehicleType')) }
      if (decoded.transmission) { setValue('transmission', decoded.transmission, opts); filled.push(fieldName('transmission')) }
      if (decoded.fuelType) { setValue('fuelType', decoded.fuelType, opts); filled.push(fieldName('fuelType')) }
      if (decoded.doors) { setValue('doors', decoded.doors, opts); filled.push(fieldName('doors')) }
      setValue('vin', vinToDecode.trim().toUpperCase(), opts)

      toast(
        filled.length > 0
          ? {
              title: t('form.vin.decoded'),
              description: t('form.vin.decodedDescription', { fields: filled.join(', ') }),
              variant: 'success',
            }
          : { title: t('form.vin.decoded'), description: t('form.vin.decodedNothing'), variant: 'error' },
      )
    } catch (err) {
      toast({
        title: t('form.vin.decodeFailed'),
        description: err instanceof ApiError ? err.message : t('form.vin.decodeFailedDescription'),
        variant: 'error',
      })
    } finally {
      setIsDecodingVin(false)
    }
  }

  const handleGenerateDescription = async (action: DescriptionAiAction) => {
    setAiAction(action)
    try {
      const description = await descriptionAiApi.generate(
        {
          make: watchedValues.make,
          model: watchedValues.model,
          year: watchedValues.year,
          vehicleType: watchedValues.vehicleType,
          color: watchedValues.color,
          transmission: watchedValues.transmission,
          fuelType: watchedValues.fuelType,
          seats: watchedValues.seats,
          doors: watchedValues.doors,
          existingDescription: watchedValues.description || undefined,
        },
        action,
      )
      setValue('description', description, { shouldDirty: true, shouldValidate: true })
    } catch (err) {
      toast({
        title: t('form.ai.failed'),
        description: err instanceof ApiError ? err.message : t('form.ai.failedDescription'),
        variant: 'error',
      })
    } finally {
      setAiAction(null)
    }
  }

  /**
   * Puts a rejection back on the field that caused it and returns the user to that step.
   * Otherwise a failed publish is just a toast on the Review step, with every field still
   * looking valid and nothing indicating what to change.
   */
  const handleSubmitError = (error: unknown) => {
    const applied = applyVehicleApiError(error, setError)
    if (applied.step !== undefined) setStepIndex(applied.step)
    if (!applied.handled) {
      toast({ title: t('form.publishFailed'), description: applied.message, variant: 'error' })
    }
  }

  const onSubmit = (values: VehicleFormValues) => {
    const input: VehicleInput = formValuesToVehicleInput(values)
    // Only a wizard that was never saved still holds files locally: anything uploaded against
    // a vehicle or a draft is already on the server, and publishing re-parents the draft's.
    const pickedFiles = values.photos.map((p) => p.file).filter((f): f is File => Boolean(f))

    // Twenty uploads would hold the Publish button, so the details page starts them and shows
    // the progress.
    const goToVehicle = (createdId: string) => {
      handOffPhotos(createdId, pickedFiles)
      navigate(`/app/vehicles/${createdId}`)
    }

    if (isEdit && vehicleId) {
      updateVehicle.mutate(input, {
        onSuccess: () => goToVehicle(vehicleId),
        onError: handleSubmitError,
      })
    } else if (draftId) {
      // One transaction: the draft is only discarded once the vehicle is accepted, so a
      // rejected publish leaves it intact to correct and retry.
      publishDraft.mutate(
        { id: draftId, input },
        { onSuccess: (created) => goToVehicle(created.id), onError: handleSubmitError },
      )
    } else {
      createVehicle.mutate(input, {
        onSuccess: (created) => goToVehicle(created.id),
        onError: handleSubmitError,
      })
    }
  }

  return (
    <PageContainer>
      <PageHeader title={isEdit ? t('form.editTitle') : t('form.addTitle')} description={t('form.subtitle')} />

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
          {stepKey === 'details' && (
            <div className="flex flex-col gap-6">
              <div className="border-border-strong bg-surface-2 flex flex-col gap-2.5 rounded-[9px] border border-dashed p-3.5 sm:flex-row sm:items-end sm:gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <label htmlFor="vin-decode" className="text-label flex items-center gap-1.5 font-medium">
                    <ScanLine className="text-fg-4 size-4" />
                    {t('form.vin.decodeLabel')}
                  </label>
                  <Input
                    id="vin-decode"
                    className="font-mono"
                    placeholder={t('form.vin.placeholder')}
                    value={vinToDecode}
                    onChange={(e) => setVinToDecode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && vinToDecode.trim()) {
                        e.preventDefault()
                        void handleDecodeVin()
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  loading={isDecodingVin}
                  disabled={!vinToDecode.trim()}
                  onClick={() => void handleDecodeVin()}
                >
                  {t('form.vin.decode')}
                </Button>
              </div>

              <div>
                <p className="text-meta text-fg-3 mb-3">{t('form.sections.identity')}</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label={t('form.fields.make')} error={errors.make?.message} required>
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="make"
                        render={({ field }) => (
                          <Combobox
                            id={id}
                            aria-label={t('form.fields.make')}
                            value={field.value}
                            onChange={(next) => {
                              field.onChange(next)
                              if (!modelsForMake(next).includes(watchedValues.model)) setValue('model', '')
                            }}
                            options={VEHICLE_MAKES}
                            placeholder={t('form.fields.makePlaceholder')}
                            invalid={Boolean(errors.make)}
                          />
                        )}
                      />
                    )}
                  </FormField>
                  <FormField label={t('form.fields.model')} error={errors.model?.message} required>
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="model"
                        render={({ field }) => (
                          <Combobox
                            id={id}
                            aria-label={t('form.fields.model')}
                            value={field.value}
                            onChange={field.onChange}
                            options={modelsForMake(watchedValues.make)}
                            placeholder={
                              watchedValues.make ? t('form.fields.modelPlaceholder') : t('form.fields.modelPickMakeFirst')
                            }
                            invalid={Boolean(errors.model)}
                          />
                        )}
                      />
                    )}
                  </FormField>
                  <FormField label={t('form.fields.year')} error={errors.year?.message} required>
                    {(fieldProps) => (
                      <Input
                        type="number"
                        placeholder={t('form.fields.yearPlaceholder')}
                        {...register('year', { valueAsNumber: true })}
                        {...fieldProps}
                      />
                    )}
                  </FormField>
                  <FormField label={t('form.fields.vehicleType')} error={errors.vehicleType?.message} required>
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="vehicleType"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id={id} aria-invalid={Boolean(errors.vehicleType)}>
                              <SelectValue placeholder={t('form.fields.vehicleTypePlaceholder')}>
                                {field.value ? domain.label('vehicleType', field.value) : undefined}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {VEHICLE_TYPES.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {domain.label('vehicleType', c)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    )}
                  </FormField>
                  <FormField label={t('form.fields.color')} error={errors.color?.message} required>
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="color"
                        render={({ field }) => (
                          <Combobox
                            id={id}
                            aria-label={t('form.fields.color')}
                            value={field.value}
                            onChange={field.onChange}
                            options={VEHICLE_COLORS}
                            placeholder={t('form.fields.colorPlaceholder')}
                            invalid={Boolean(errors.color)}
                          />
                        )}
                      />
                    )}
                  </FormField>
                  <FormField
                    label={t('form.fields.location')}
                    error={errors.location?.message}
                    required
                  >
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="location"
                        render={({ field }) => (
                          <div className="flex flex-col gap-1.5">
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={locations.isLoading || locations.isError}
                            >
                              <SelectTrigger id={id} aria-invalid={Boolean(errors.location)}>
                                <SelectValue
                                  placeholder={
                                    locations.isLoading
                                      ? t('form.fields.locationLoading')
                                      : t('form.fields.locationPlaceholder')
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {locations.names.map((name) => (
                                  <SelectItem key={name} value={name}>
                                    {name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {/* A vehicle must name a branch, so a failed load has to offer a
                                way forward instead of an empty, silent dropdown. */}
                            {locations.isError && (
                              <p className="text-error m-0 flex items-center gap-1.5 text-caption">
                                {t('form.fields.locationLoadFailed')}
                                <button
                                  type="button"
                                  onClick={locations.refetch}
                                  className="font-semibold underline underline-offset-2"
                                >
                                  {tCommon('actions.retry')}
                                </button>
                              </p>
                            )}
                            {!locations.isLoading &&
                              !locations.isError &&
                              locations.names.length === 0 && (
                                <p className="text-fg-3 m-0 text-caption">
                                  {t('form.fields.locationEmpty')}
                                </p>
                              )}
                          </div>
                        )}
                      />
                    )}
                  </FormField>
                </div>
              </div>

              <div className="border-border-soft border-t pt-5">
                <p className="text-meta text-fg-3 mb-3">{t('form.sections.registration')}</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label={t('form.fields.plate')} error={errors.plate?.message} required>
                    {(fieldProps) => <Input {...register('plate')} {...fieldProps} />}
                  </FormField>
                  <FormField label={t('form.fields.vin')} error={errors.vin?.message} required>
                    {(fieldProps) => {
                      const vinField = register('vin')
                      return (
                        <Input
                          className="font-mono uppercase"
                          {...vinField}
                          {...fieldProps}
                          onChange={(e) => {
                            e.target.value = e.target.value.toUpperCase()
                            vinField.onChange(e)
                          }}
                        />
                      )
                    }}
                  </FormField>
                  <FormField label={t('form.fields.status')} error={errors.status?.message} required>
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="status"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id={id} aria-invalid={Boolean(errors.status)}>
                              <SelectValue placeholder={t('form.fields.statusPlaceholder')}>
                                {field.value ? domain.status(field.value) : undefined}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {SELECTABLE_VEHICLE_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {domain.status(s)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    )}
                  </FormField>
                </div>
              </div>

              <div className="border-border-soft border-t pt-5">
                <p className="text-meta text-fg-3 mb-3">{t('form.sections.specs')}</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label={t('form.fields.mileage')} error={errors.mileage?.message} required>
                    {(fieldProps) => (
                      <Input
                        type="number"
                        placeholder={t('form.fields.mileagePlaceholder')}
                        {...register('mileage', { valueAsNumber: true })}
                        {...fieldProps}
                      />
                    )}
                  </FormField>
                  <FormField label={t('form.fields.transmission')} error={errors.transmission?.message} required>
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="transmission"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id={id} aria-invalid={Boolean(errors.transmission)}>
                              <SelectValue placeholder={t('form.fields.transmissionPlaceholder')}>
                                {field.value ? domain.label('transmission', field.value) : undefined}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {TRANSMISSIONS.map((tr) => (
                                <SelectItem key={tr} value={tr}>
                                  {domain.label('transmission', tr)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    )}
                  </FormField>

                  <FormField label={t('form.fields.fuelType')} error={errors.fuelType?.message} required>
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="fuelType"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id={id} aria-invalid={Boolean(errors.fuelType)}>
                              <SelectValue placeholder={t('form.fields.fuelTypePlaceholder')}>
                                {field.value ? domain.label('fuelType', field.value) : undefined}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {FUEL_TYPES.map((f) => (
                                <SelectItem key={f} value={f}>
                                  {domain.label('fuelType', f)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    )}
                  </FormField>
                  <FormField label={t('form.fields.seats')} error={errors.seats?.message} required>
                    {(fieldProps) => <Input type="number" {...register('seats', { valueAsNumber: true })} {...fieldProps} />}
                  </FormField>
                  <FormField label={t('form.fields.doors')} error={errors.doors?.message} required>
                    {(fieldProps) => <Input type="number" {...register('doors', { valueAsNumber: true })} {...fieldProps} />}
                  </FormField>
                </div>
              </div>

              <div className="border-border-soft border-t pt-5">
                <p className="text-meta text-fg-3 mb-3">{t('form.sections.features')}</p>
                <Controller
                  control={control}
                  name="features"
                  render={({ field }) => (
                    <VehicleFeaturesPicker
                      selected={field.value ?? []}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

              <div className="border-border-soft border-t pt-5">
                <FormField label={t('form.fields.description')} error={errors.description?.message}>
                  {(fieldProps) => (
                    <div className="flex flex-col gap-2">
                      <Textarea rows={3} {...register('description')} {...fieldProps} />
                      {!errors.description && (
                        <p className="text-description">{t('form.fields.descriptionHint')}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Sparkles className="text-fg-4 size-3.5" aria-hidden />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          loading={aiAction === 'generate'}
                          disabled={aiAction !== null && aiAction !== 'generate'}
                          onClick={() => void handleGenerateDescription('generate')}
                        >
                          {t('form.ai.generate')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          loading={aiAction === 'improve'}
                          disabled={!watchedValues.description || (aiAction !== null && aiAction !== 'improve')}
                          onClick={() => void handleGenerateDescription('improve')}
                        >
                          {t('form.ai.improve')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          loading={aiAction === 'shorten'}
                          disabled={!watchedValues.description || (aiAction !== null && aiAction !== 'shorten')}
                          onClick={() => void handleGenerateDescription('shorten')}
                        >
                          {t('form.ai.shorten')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          loading={aiAction === 'expand'}
                          disabled={!watchedValues.description || (aiAction !== null && aiAction !== 'expand')}
                          onClick={() => void handleGenerateDescription('expand')}
                        >
                          {t('form.ai.expand')}
                        </Button>
                      </div>
                    </div>
                  )}
                </FormField>
              </div>
            </div>
          )}

          {stepKey === 'photos' &&
            // Anything with an id — a vehicle, or a saved draft — uploads against the API. A
            // wizard that has never been saved has nothing to attach to, so its files are held
            // locally until the first "Save & exit" or publish creates a row.
            (photoTarget ? (
              <VehiclePhotoEditor target={photoTarget} photos={existingPhotos} />
            ) : (
              <Controller
                control={control}
                name="photos"
                render={({ field }) => <PhotoDropzone value={field.value} onChange={field.onChange} />}
              />
            ))}

          {stepKey === 'pricing' && (
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-meta text-fg-3 mb-1">{t('form.sections.rateOptions')}</p>
                <p className="text-fg-4 mb-3.5 text-[12.5px]">{t('form.sections.rateOptionsHint')}</p>
                <Controller
                  control={control}
                  name="rateOptions"
                  render={({ field }) => (
                    <RateOptionsEditor
                      value={field.value}
                      onChange={field.onChange}
                      errors={errors.rateOptions}
                      rootError={errors.rateOptions?.message ?? errors.rateOptions?.root?.message}
                      showAllErrors={Boolean(stepValidationAttempted[stepIndex])}
                    />
                  )}
                />
              </div>

              <div className="border-border-soft border-t pt-5">
                <p className="text-meta text-fg-3 mb-1">{t('form.sections.fees')}</p>
                <p className="text-fg-4 mb-3.5 text-[12.5px]">{t('form.sections.feesHint')}</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <FormField label={t('form.fields.deposit')} error={errors.deposit?.message} required>
                    {(fieldProps) => (
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={t('form.fields.depositPlaceholder')}
                        {...register('deposit', { valueAsNumber: true })}
                        {...fieldProps}
                      />
                    )}
                  </FormField>
                  <FormField label={t('form.fields.overageRate')} error={errors.overageRatePerMile?.message} required>
                    {(fieldProps) => (
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={t('form.fields.overageRatePlaceholder')}
                        {...register('overageRatePerMile', { valueAsNumber: true })}
                        {...fieldProps}
                      />
                    )}
                  </FormField>
                  <FormField label={t('form.fields.fuelCharge')} error={errors.fuelChargeRate?.message}>
                    {(fieldProps) => (
                      <Input type="number" step="0.01" {...register('fuelChargeRate', { valueAsNumber: true })} {...fieldProps} />
                    )}
                  </FormField>
                  <FormField label={t('form.fields.taxRate')} error={errors.taxRatePct?.message}>
                    {(fieldProps) => <Input type="number" step="0.1" {...register('taxRatePct', { valueAsNumber: true })} {...fieldProps} />}
                  </FormField>
                </div>
              </div>
            </div>
          )}

          {stepKey === 'review' && (
            <ReviewStep
              values={watchedValues}
              photos={photoTarget ? existingPhotos : watchedValues.photos}
              onEditStep={(key) => setStepIndex(STEP_KEYS.indexOf(key))}
            />
          )}

          <div className="border-border-soft flex flex-wrap items-center justify-between gap-2.5 border-t pt-4">
            <Button type="button" variant="ghost" onClick={saveDraftAndExit} className="gap-1.5">
              <Save className="size-4" />
              {t('form.draft.saveAndExit')}
            </Button>

            <div className="flex gap-2.5">
              {stepIndex > 0 && (
                <Button type="button" variant="outline" onClick={goPrev}>
                  {t('form.nav.previousStep')}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                {t('form.nav.cancel')}
              </Button>
              {stepKey !== 'review' ? (
                <Button type="button" onClick={goNext}>
                  {t('form.nav.nextStep')}
                </Button>
              ) : (
                <Button type="button" loading={isSubmitting} onClick={handleSubmit(onSubmit)} className="gap-1.5">
                  {isEdit ? t('form.nav.saveChanges') : t('form.nav.publish')}
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              )}
            </div>
          </div>
        </form>
      </Card>
    </PageContainer>
  )
}

function ReviewStep({
  values,
  photos,
  onEditStep,
}: {
  values: VehicleFormValues
  /**
   * The photos as the server holds them. Not `values.photos`: once there is a vehicle or a
   * draft to upload against, the Photos step writes straight to the API and leaves form state
   * untouched, so reading it here would show a stale set with dead object URLs.
   */
  photos: VehiclePhoto[]
  onEditStep: (step: StepKey) => void
}) {
  const { t } = useTranslation('vehicles')
  const domain = useDomainLabels()
  const format = useFormatters()
  const cover = photos[0]
  const editDetails = () => onEditStep('details')

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-4 pb-5">
        <div className="border-border bg-surface-2 flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[9px] border">
          {cover?.url ? (
            <img src={photoThumbnail(cover)} alt={cover.name} className="size-full object-cover" />
          ) : (
            <ImageOff className="text-fg-4 size-6" aria-hidden />
          )}
        </div>
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-panel-title">
              {values.make || t('form.review.makeFallback')} {values.model || t('form.review.modelFallback')}
            </p>
            <p className="text-fg-3 text-[13px]">
              {values.year} · {values.vehicleType ? domain.label('vehicleType', values.vehicleType) : ''}
            </p>
          </div>
          {values.status && <StatusBadge status={values.status} />}
        </div>
      </div>

      {/* Two columns of stacked cards, filling the available width. Rows inside each card are
          stacked label/value cells (see ReviewRow), so a wider card reflows cells into more
          columns rather than stretching any single row. */}
      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-2">
        <div className="flex flex-col gap-3.5">
          <ReviewSection title={t('form.review.identity')} onEdit={editDetails}>
            <ReviewRowGrid>
              <ReviewRow label={t('specs.make')} value={values.make || '—'} />
              <ReviewRow label={t('specs.model')} value={values.model || '—'} />
              <ReviewRow label={t('specs.year')} value={values.year || '—'} />
              <ReviewRow
                label={t('specs.vehicleType')}
                value={values.vehicleType ? domain.label('vehicleType', values.vehicleType) : '—'}
              />
              <ReviewRow label={t('specs.color')} value={values.color || '—'} />
              {/* Grouped with Identity to mirror the form, where Location sits in the same block. */}
              <ReviewRow label={t('specs.location')} value={values.location || '—'} />
            </ReviewRowGrid>
          </ReviewSection>

          <ReviewSection title={t('form.review.registration')} onEdit={editDetails}>
            <ReviewRowGrid>
              <ReviewRow label={t('specs.plate')} value={values.plate || '—'} />
              <ReviewRow label={t('specs.vin')} value={values.vin || '—'} />
              <ReviewRow label={t('specs.status')} value={values.status ? domain.status(values.status) : '—'} />
            </ReviewRowGrid>
          </ReviewSection>

          <ReviewSection title={t('form.review.specs')} onEdit={editDetails}>
            <ReviewRowGrid>
              <ReviewRow label={t('specs.currentMileage')} value={`${format.number(values.mileage ?? 0)} mi`} />
              <ReviewRow
                label={t('specs.transmission')}
                value={values.transmission ? domain.label('transmission', values.transmission) : '—'}
              />
              <ReviewRow
                label={t('specs.fuelType')}
                value={values.fuelType ? domain.label('fuelType', values.fuelType) : '—'}
              />
              <ReviewRow
                label={t('form.review.seatsDoors')}
                value={t('form.review.seatsDoorsValue', { seats: values.seats, doors: values.doors })}
              />
            </ReviewRowGrid>
          </ReviewSection>

          {values.features.length > 0 && (
            <ReviewSection title={t('form.review.features')} onEdit={editDetails}>
              <VehicleFeatureChips features={values.features} />
            </ReviewSection>
          )}

          {values.description && (
            <ReviewSection title={t('form.review.description')} onEdit={editDetails}>
              <p className="text-fg-2 text-[13px]" style={{ textWrap: 'pretty' }}>
                {values.description}
              </p>
            </ReviewSection>
          )}
        </div>

        <div className="flex flex-col gap-3.5">
          <ReviewSection
            title={t('form.review.photos')}
            count={photos.length}
            onEdit={() => onEditStep('photos')}
          >
            {photos.length > 0 ? (
              <div className="grid grid-cols-5 gap-2">
                {photos.map((p, index) => (
                  <div key={p.id} className="border-border relative aspect-square overflow-hidden rounded-[7px] border">
                    {p.url ? (
                      <img src={photoThumbnail(p)} alt={p.name} className="size-full object-cover" />
                    ) : (
                      // Still being rendered by the worker — an <img> here shows a broken icon.
                      <span
                        role="status"
                        aria-label={t('gallery.processing')}
                        className="bg-surface-2 text-fg-4 flex size-full items-center justify-center"
                      >
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      </span>
                    )}
                    {index === 0 && (
                      <span className="bg-foreground/70 text-background absolute top-1 left-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold">
                        {t('gallery.cover')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-fg-4 text-[13px]">{t('form.review.noPhotos')}</p>
            )}
          </ReviewSection>

          <ReviewSection
            title={t('form.review.rateOptions')}
            count={values.rateOptions.length}
            onEdit={() => onEditStep('pricing')}
          >
            {values.rateOptions.length > 0 ? (
              <div className="divide-y divide-[var(--color-border-soft)]">
                {values.rateOptions.map((option) => (
                  <div key={option.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-2">
                    <span className="text-[13px] font-semibold">{option.label || t('form.review.untitledOption')}</span>
                    <span className="text-fg-3 flex flex-wrap items-center gap-x-2 text-[12.5px]">
                      <span>{formatRateOptionBasis(option, t)}</span>
                      <span aria-hidden>·</span>
                      <span>{formatRateOptionMileage(option, t)}</span>
                      <span className="text-foreground font-semibold">{formatRateOptionPrice(option)}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-fg-4 text-[13px]">{t('form.review.noRateOptions')}</p>
            )}
          </ReviewSection>

          <ReviewSection title={t('form.review.fees')} onEdit={() => onEditStep('pricing')}>
            <ReviewRowGrid>
              {hasValue(values.deposit) && (
                <ReviewRow label={t('fees.securityDeposit')} value={format.currency(values.deposit)} />
              )}
              {hasValue(values.overageRatePerMile) && (
                <ReviewRow label={t('fees.overageRate')} value={`${format.currency(values.overageRatePerMile)}/mi`} />
              )}
              {hasValue(values.fuelChargeRate) && (
                <ReviewRow
                  label={t('fees.fuelCharge')}
                  value={`${format.currency(values.fuelChargeRate)} ${t('form.fields.fuelChargeUnit')}`}
                />
              )}
              {hasValue(values.taxRatePct) && <ReviewRow label={t('fees.taxRate')} value={`${values.taxRatePct}%`} />}
            </ReviewRowGrid>
          </ReviewSection>
        </div>
      </div>
    </div>
  )
}
