import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { ImageOff, ScanLine, Save, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { toast } from '@/components/ui/use-toast'
import { ApiError } from '@/types/api'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { FormField } from '@/components/forms/FormField'
import { PhotoDropzone } from '@/components/forms/PhotoDropzone'
import { RateOptionsEditor } from '@/modules/vehicles/components/RateOptionsEditor'
import { ReviewRow, ReviewSection } from '@/modules/vehicles/components/ReviewSummary'
import { Stepper, type StepDef } from '@/components/forms/Stepper'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { LOCATIONS } from '@/modules/locations/mock/location.mock'
import { VEHICLE_COLORS, VEHICLE_MAKES, modelsForMake } from '@/modules/vehicles/data/vehicle-catalog'
import { decodeVin } from '@/modules/vehicles/api/vin-decoder.api'
import { descriptionAiApi, type DescriptionAiAction } from '@/modules/vehicles/api/description-ai.api'
import { STEP_FIELDS, vehicleFormSchema, type VehicleFormValues } from '@/modules/vehicles/schema/vehicle.schema'
import {
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_CLASSES,
  VEHICLE_STATUSES,
  type VehicleInput,
} from '@/modules/vehicles/types/vehicle.types'
import { useCreateVehicle, useUpdateVehicle, useVehicle } from '@/modules/vehicles/hooks/use-vehicles'
import {
  clearVehicleDraft,
  readVehicleDraft,
  useVehicleDraftAutosave,
  vehicleDraftKey,
  writeVehicleDraft,
  type VehicleDraft,
} from '@/modules/vehicles/hooks/use-vehicle-draft'
import {
  formatCurrency,
  formatRateOptionBasis,
  formatRateOptionMileage,
  formatRateOptionPrice,
  valuesFromVehicle,
} from '@/modules/vehicles/utils/vehicle.utils'

const STEPS: StepDef[] = [
  { key: 'details', label: 'Vehicle details' },
  { key: 'photos', label: 'Photos' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'review', label: 'Review' },
]

const EMPTY_VALUES: VehicleFormValues = {
  make: '',
  model: '',
  year: undefined as unknown as number,
  class: '' as VehicleFormValues['class'],
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
  topSpeedMph: undefined,
  horsepower: undefined,
  zeroToSixtySec: undefined,
  cylinders: undefined,
  description: '',
  photos: [],
  rateOptions: [],
  deposit: undefined as unknown as number,
  overageRatePerMile: undefined as unknown as number,
  fuelChargeRate: undefined,
  taxRatePct: undefined,
}

/**
 * A restored draft may predate a schema change (renamed enum, new required field), so its
 * required-select values aren't guaranteed to still be valid — fall back to defaults for any
 * that no longer match a known option, same as a brand-new form would use.
 */
function sanitizeDraftValues(values: VehicleFormValues): VehicleFormValues {
  return {
    ...EMPTY_VALUES,
    ...values,
    class: (VEHICLE_CLASSES as readonly string[]).includes(values.class) ? values.class : EMPTY_VALUES.class,
    status: (VEHICLE_STATUSES as readonly string[]).includes(values.status) ? values.status : EMPTY_VALUES.status,
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
    class: values.class,
    color: values.color,
    plate: values.plate,
    vin: values.vin,
    location: values.location,
    status: values.status,
    mileage: values.mileage,
    description: values.description || undefined,
    photos: values.photos,
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
      topSpeedMph: values.topSpeedMph,
      horsepower: values.horsepower,
      zeroToSixtySec: values.zeroToSixtySec,
      cylinders: values.cylinders,
    },
  }
}

/** RHF's valueAsNumber yields NaN (not undefined) for a cleared numeric input — treat both as "no value". */
function hasValue(n: number | undefined): n is number {
  return n != null && !Number.isNaN(n)
}

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  return `${hours}h ago`
}

export function VehicleFormPage() {
  const { vehicleId } = useParams()
  const isEdit = Boolean(vehicleId)
  const draftKey = vehicleDraftKey(vehicleId)

  const { data: vehicle, isLoading, isError, refetch } = useVehicle(vehicleId)
  const [existingDraft] = useState<VehicleDraft | null>(() => readVehicleDraft(draftKey))
  const [draftChoice, setDraftChoice] = useState<'pending' | 'restore' | 'fresh'>(existingDraft ? 'pending' : 'fresh')

  if (isEdit && isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading vehicle…" />
      </PageContainer>
    )
  }

  if (isEdit && (isError || !vehicle)) {
    return (
      <PageContainer>
        <PageHeader title="Edit vehicle" description="Vehicle details and pricing" />
        <ErrorState description="We couldn't load this vehicle." onRetry={() => refetch()} />
      </PageContainer>
    )
  }

  if (draftChoice === 'pending' && existingDraft) {
    return (
      <PageContainer>
        <PageHeader title={isEdit ? 'Edit vehicle' : 'Add vehicle'} description="Vehicle details and pricing" />
        <Card className="flex flex-wrap items-center justify-between gap-3 p-[18px]">
          <div>
            <p className="text-[13.5px] font-semibold">Unsaved changes found</p>
            <p className="text-fg-3 text-[13px]">
              We found a draft you were working on {timeAgo(existingDraft.savedAt)}. Restore it, or start fresh.
            </p>
          </div>
          <div className="flex shrink-0 gap-2.5">
            <Button
              variant="outline"
              onClick={() => {
                clearVehicleDraft(draftKey)
                setDraftChoice('fresh')
              }}
            >
              Discard draft
            </Button>
            <Button onClick={() => setDraftChoice('restore')}>Restore draft</Button>
          </div>
        </Card>
      </PageContainer>
    )
  }

  const initialValues =
    draftChoice === 'restore' && existingDraft
      ? sanitizeDraftValues(existingDraft.values)
      : vehicle
        ? valuesFromVehicle(vehicle)
        : EMPTY_VALUES
  const initialStep = draftChoice === 'restore' && existingDraft ? existingDraft.step : 0

  return (
    <VehicleForm
      key={`${vehicle?.id ?? 'new'}-${draftChoice}`}
      initialValues={initialValues}
      initialStep={initialStep}
      vehicleId={vehicleId}
      isEdit={isEdit}
      draftKey={draftKey}
    />
  )
}

function VehicleForm({
  initialValues,
  initialStep,
  vehicleId,
  isEdit,
  draftKey,
}: {
  initialValues: VehicleFormValues
  initialStep: number
  vehicleId?: string
  isEdit: boolean
  draftKey: string
}) {
  const navigate = useNavigate()
  const createVehicle = useCreateVehicle()
  const updateVehicle = useUpdateVehicle(vehicleId ?? '')
  const [stepIndex, setStepIndex] = useState(Math.min(initialStep, STEPS.length - 1))
  const [furthestIndex, setFurthestIndex] = useState(Math.min(initialStep, STEPS.length - 1))
  const [vinToDecode, setVinToDecode] = useState('')
  const [isDecodingVin, setIsDecodingVin] = useState(false)
  const [aiAction, setAiAction] = useState<DescriptionAiAction | null>(null)
  const [stepValidationAttempted, setStepValidationAttempted] = useState<Record<number, boolean>>({})

  const {
    control,
    register,
    handleSubmit,
    trigger,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<VehicleFormValues>({ resolver: zodResolver(vehicleFormSchema), defaultValues: initialValues, mode: 'onChange' })

  const watchedValues = useWatch({ control }) as VehicleFormValues
  const lastSavedAt = useVehicleDraftAutosave(draftKey, watchedValues, stepIndex, isDirty)

  const stepKey = STEPS[stepIndex].key

  const goNext = async () => {
    setStepValidationAttempted((a) => ({ ...a, [stepIndex]: true }))
    const fields = STEP_FIELDS[stepKey as keyof typeof STEP_FIELDS]
    const valid = fields.length === 0 ? true : await trigger(fields as (keyof VehicleFormValues)[])
    if (!valid) return
    const next = Math.min(stepIndex + 1, STEPS.length - 1)
    setStepIndex(next)
    setFurthestIndex((f) => Math.max(f, next))
  }

  const goPrev = () => setStepIndex((i) => Math.max(i - 1, 0))

  const saveDraftAndExit = () => {
    writeVehicleDraft(draftKey, watchedValues, stepIndex)
    navigate('/app/vehicles')
  }

  const handleDecodeVin = async () => {
    setIsDecodingVin(true)
    try {
      const decoded = await decodeVin(vinToDecode)
      const filled: string[] = []

      const opts = { shouldDirty: true, shouldValidate: true } as const

      if (decoded.make) { setValue('make', decoded.make, opts); filled.push('make') }
      if (decoded.model) { setValue('model', decoded.model, opts); filled.push('model') }
      if (decoded.year) { setValue('year', decoded.year, opts); filled.push('year') }
      if (decoded.vehicleType) { setValue('class', decoded.vehicleType, opts); filled.push('vehicle type') }
      if (decoded.transmission) { setValue('transmission', decoded.transmission, opts); filled.push('transmission') }
      if (decoded.fuelType) { setValue('fuelType', decoded.fuelType, opts); filled.push('fuel type') }
      if (decoded.doors) { setValue('doors', decoded.doors, opts); filled.push('doors') }
      if (decoded.cylinders) { setValue('cylinders', decoded.cylinders, opts); filled.push('cylinders') }
      if (decoded.horsepower) { setValue('horsepower', decoded.horsepower, opts); filled.push('power') }
      setValue('vin', vinToDecode.trim().toUpperCase(), opts)

      toast(
        filled.length > 0
          ? { title: 'VIN decoded', description: `Filled in ${filled.join(', ')} from the VIN.`, variant: 'success' }
          : { title: 'VIN decoded', description: "Didn't recognize enough to auto-fill any fields.", variant: 'error' },
      )
    } catch (err) {
      toast({
        title: "Couldn't decode VIN",
        description: err instanceof ApiError ? err.message : 'Something went wrong decoding this VIN.',
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
          vehicleType: watchedValues.class,
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
        title: "Couldn't generate description",
        description: err instanceof ApiError ? err.message : 'Something went wrong generating this description.',
        variant: 'error',
      })
    } finally {
      setAiAction(null)
    }
  }

  const onSubmit = (values: VehicleFormValues) => {
    const input = formValuesToVehicleInput(values)
    if (isEdit && vehicleId) {
      updateVehicle.mutate(input, {
        onSuccess: () => {
          clearVehicleDraft(draftKey)
          navigate(`/app/vehicles/${vehicleId}`)
        },
      })
    } else {
      createVehicle.mutate(input, {
        onSuccess: (created) => {
          clearVehicleDraft(draftKey)
          navigate(`/app/vehicles/${created.id}`)
        },
      })
    }
  }

  return (
    <PageContainer>
      <PageHeader title={isEdit ? 'Edit vehicle' : 'Add vehicle'} description="Vehicle details and pricing" />

      <Card as="section" className="p-[18px]">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <Stepper
            steps={STEPS}
            currentIndex={stepIndex}
            furthestIndex={furthestIndex}
            onStepClick={(i) => setStepIndex(i)}
          />
          {lastSavedAt && <span className="text-fg-4 text-[12px] whitespace-nowrap">Draft saved {timeAgo(lastSavedAt)}</span>}
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
                    Decode VIN
                  </label>
                  <Input
                    id="vin-decode"
                    className="font-mono"
                    placeholder="Enter a VIN to auto-fill make, model, year & specs"
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
                  Decode
                </Button>
              </div>

              <div>
                <p className="text-meta text-fg-3 mb-3">Identity</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label="Make" error={errors.make?.message} required>
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="make"
                        render={({ field }) => (
                          <Combobox
                            id={id}
                            aria-label="Make"
                            value={field.value}
                            onChange={(next) => {
                              field.onChange(next)
                              if (!modelsForMake(next).includes(watchedValues.model)) setValue('model', '')
                            }}
                            options={VEHICLE_MAKES}
                            placeholder="Select or type a make"
                            invalid={Boolean(errors.make)}
                          />
                        )}
                      />
                    )}
                  </FormField>
                  <FormField label="Model" error={errors.model?.message} required>
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="model"
                        render={({ field }) => (
                          <Combobox
                            id={id}
                            aria-label="Model"
                            value={field.value}
                            onChange={field.onChange}
                            options={modelsForMake(watchedValues.make)}
                            placeholder={watchedValues.make ? 'Select or type a model' : 'Pick a make first'}
                            invalid={Boolean(errors.model)}
                          />
                        )}
                      />
                    )}
                  </FormField>
                  <FormField label="Year" error={errors.year?.message} required>
                    {(fieldProps) => <Input type="number" placeholder="e.g. 2024" {...register('year', { valueAsNumber: true })} {...fieldProps} />}
                  </FormField>
                  <FormField label="Vehicle type" error={errors.class?.message} required>
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="class"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id={id} aria-invalid={Boolean(errors.class)}>
                              <SelectValue placeholder="Select vehicle type" />
                            </SelectTrigger>
                            <SelectContent>
                              {VEHICLE_CLASSES.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    )}
                  </FormField>
                  <FormField label="Color" error={errors.color?.message} required>
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="color"
                        render={({ field }) => (
                          <Combobox
                            id={id}
                            aria-label="Color"
                            value={field.value}
                            onChange={field.onChange}
                            options={VEHICLE_COLORS}
                            placeholder="Select or type a color"
                            invalid={Boolean(errors.color)}
                          />
                        )}
                      />
                    )}
                  </FormField>
                  <FormField label="Location" error={errors.location?.message} required>
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="location"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id={id} aria-invalid={Boolean(errors.location)}>
                              <SelectValue placeholder="Select location" />
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
                </div>
              </div>

              <div className="border-border-soft border-t pt-5">
                <p className="text-meta text-fg-3 mb-3">Registration &amp; status</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label="Plate" error={errors.plate?.message} required>
                    {(fieldProps) => <Input {...register('plate')} {...fieldProps} />}
                  </FormField>
                  <FormField label="VIN" error={errors.vin?.message} required>
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
                  <FormField label="Status" error={errors.status?.message} required>
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="status"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id={id} aria-invalid={Boolean(errors.status)}>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              {VEHICLE_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
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
                <p className="text-meta text-fg-3 mb-3">Specs</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label="Current mileage (mi)" error={errors.mileage?.message} required>
                    {(fieldProps) => <Input type="number" placeholder="e.g. 12000" {...register('mileage', { valueAsNumber: true })} {...fieldProps} />}
                  </FormField>
                  <FormField label="Transmission" error={errors.transmission?.message} required>
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="transmission"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id={id} aria-invalid={Boolean(errors.transmission)}>
                              <SelectValue placeholder="Select transmission" />
                            </SelectTrigger>
                            <SelectContent>
                              {TRANSMISSIONS.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    )}
                  </FormField>

                  <FormField label="Fuel type" error={errors.fuelType?.message} required>
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="fuelType"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id={id} aria-invalid={Boolean(errors.fuelType)}>
                              <SelectValue placeholder="Select fuel type" />
                            </SelectTrigger>
                            <SelectContent>
                              {FUEL_TYPES.map((f) => (
                                <SelectItem key={f} value={f}>
                                  {f}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    )}
                  </FormField>
                  <FormField label="Seats" error={errors.seats?.message} required>
                    {(fieldProps) => <Input type="number" {...register('seats', { valueAsNumber: true })} {...fieldProps} />}
                  </FormField>
                  <FormField label="Doors" error={errors.doors?.message} required>
                    {(fieldProps) => <Input type="number" {...register('doors', { valueAsNumber: true })} {...fieldProps} />}
                  </FormField>
                </div>
              </div>

              <div className="border-border-soft border-t pt-5">
                <p className="text-meta text-fg-3 mb-3">Performance (optional)</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <FormField label="Top speed (mph)" error={errors.topSpeedMph?.message}>
                    {(fieldProps) => <Input type="number" {...register('topSpeedMph', { valueAsNumber: true })} {...fieldProps} />}
                  </FormField>
                  <FormField label="Power (hp)" error={errors.horsepower?.message}>
                    {(fieldProps) => <Input type="number" {...register('horsepower', { valueAsNumber: true })} {...fieldProps} />}
                  </FormField>
                  <FormField label="0–60 mph (sec)" error={errors.zeroToSixtySec?.message}>
                    {(fieldProps) => <Input type="number" step="0.1" {...register('zeroToSixtySec', { valueAsNumber: true })} {...fieldProps} />}
                  </FormField>
                  <FormField label="Cylinders" error={errors.cylinders?.message}>
                    {(fieldProps) => <Input type="number" {...register('cylinders', { valueAsNumber: true })} {...fieldProps} />}
                  </FormField>
                </div>
              </div>

              <div className="border-border-soft border-t pt-5">
                <FormField label="Description" error={errors.description?.message}>
                  {(fieldProps) => (
                    <div className="flex flex-col gap-2">
                      <Textarea rows={3} {...register('description')} {...fieldProps} />
                      {!errors.description && (
                        <p className="text-description">Customer-facing summary shown on the vehicle listing.</p>
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
                          Generate
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          loading={aiAction === 'improve'}
                          disabled={!watchedValues.description || (aiAction !== null && aiAction !== 'improve')}
                          onClick={() => void handleGenerateDescription('improve')}
                        >
                          Improve wording
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          loading={aiAction === 'shorten'}
                          disabled={!watchedValues.description || (aiAction !== null && aiAction !== 'shorten')}
                          onClick={() => void handleGenerateDescription('shorten')}
                        >
                          Shorten
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          loading={aiAction === 'expand'}
                          disabled={!watchedValues.description || (aiAction !== null && aiAction !== 'expand')}
                          onClick={() => void handleGenerateDescription('expand')}
                        >
                          Expand
                        </Button>
                      </div>
                    </div>
                  )}
                </FormField>
              </div>
            </div>
          )}

          {stepKey === 'photos' && (
            <Controller
              control={control}
              name="photos"
              render={({ field }) => <PhotoDropzone value={field.value} onChange={field.onChange} />}
            />
          )}

          {stepKey === 'pricing' && (
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-meta text-fg-3 mb-1">Rate options</p>
                <p className="text-fg-4 mb-3.5 text-[12.5px]">
                  Each option is one way a renter can book this vehicle, with its own mileage allowance.
                </p>
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
                <p className="text-meta text-fg-3 mb-1">Deposit, fees &amp; tax</p>
                <p className="text-fg-4 mb-3.5 text-[12.5px]">Applied to every booking, whichever rate option is used.</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <FormField label="Security deposit (USD)" error={errors.deposit?.message} required>
                    {(fieldProps) => <Input type="number" step="0.01" placeholder="e.g. 500" {...register('deposit', { valueAsNumber: true })} {...fieldProps} />}
                  </FormField>
                  <FormField label="Overage rate (per mile)" error={errors.overageRatePerMile?.message} required>
                    {(fieldProps) => (
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 0.35"
                        {...register('overageRatePerMile', { valueAsNumber: true })}
                        {...fieldProps}
                      />
                    )}
                  </FormField>
                  <FormField label="Fuel charge (per 1/8 tank)" error={errors.fuelChargeRate?.message}>
                    {(fieldProps) => (
                      <Input type="number" step="0.01" {...register('fuelChargeRate', { valueAsNumber: true })} {...fieldProps} />
                    )}
                  </FormField>
                  <FormField label="Tax rate (%)" error={errors.taxRatePct?.message}>
                    {(fieldProps) => <Input type="number" step="0.1" {...register('taxRatePct', { valueAsNumber: true })} {...fieldProps} />}
                  </FormField>
                </div>
              </div>
            </div>
          )}

          {stepKey === 'review' && <ReviewStep values={watchedValues} />}

          <div className="border-border-soft flex flex-wrap items-center justify-between gap-2.5 border-t pt-4">
            <Button type="button" variant="ghost" onClick={saveDraftAndExit} className="gap-1.5">
              <Save className="size-4" />
              Save draft & exit
            </Button>

            <div className="flex gap-2.5">
              {stepIndex > 0 && (
                <Button type="button" variant="outline" onClick={goPrev}>
                  Previous step
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  clearVehicleDraft(draftKey)
                  navigate(-1)
                }}
              >
                Cancel
              </Button>
              {stepKey !== 'review' ? (
                <Button type="button" onClick={goNext}>
                  Next step
                </Button>
              ) : (
                <Button type="button" loading={isSubmitting} onClick={handleSubmit(onSubmit)}>
                  {isEdit ? 'Save changes' : 'Publish vehicle'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Card>
    </PageContainer>
  )
}

function ReviewStep({ values }: { values: VehicleFormValues }) {
  const hasPerformance =
    hasValue(values.topSpeedMph) || hasValue(values.horsepower) || hasValue(values.zeroToSixtySec) || hasValue(values.cylinders)
  const cover = values.photos[0]

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-4 pb-5">
        <div className="border-border bg-surface-2 flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-[9px] border">
          {cover ? (
            <img src={cover.url} alt={cover.name} className="size-full object-cover" />
          ) : (
            <ImageOff className="text-fg-4 size-6" aria-hidden />
          )}
        </div>
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-panel-title">
              {values.make || 'Make'} {values.model || 'Model'}
            </p>
            <p className="text-fg-3 text-[13px]">
              {values.year} · {values.class}
            </p>
          </div>
          {values.status && <StatusBadge status={values.status} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
        <div className="flex flex-col">
          <ReviewSection title="Identity">
            <div className="border-border-soft divide-y divide-[var(--color-border-soft)] border-t">
              <ReviewRow label="Make" value={values.make || '—'} />
              <ReviewRow label="Model" value={values.model || '—'} />
              <ReviewRow label="Year" value={values.year || '—'} />
              <ReviewRow label="Vehicle type" value={values.class || '—'} />
              <ReviewRow label="Color" value={values.color || '—'} />
            </div>
          </ReviewSection>

          <ReviewSection title="Registration & status">
            <div className="border-border-soft divide-y divide-[var(--color-border-soft)] border-t">
              <ReviewRow label="Plate" value={values.plate || '—'} />
              <ReviewRow label="VIN" value={values.vin || '—'} />
              <ReviewRow label="Status" value={values.status || '—'} />
            </div>
          </ReviewSection>

          <ReviewSection title="Specs">
            <div className="border-border-soft divide-y divide-[var(--color-border-soft)] border-t">
              <ReviewRow label="Location" value={values.location || '—'} />
              <ReviewRow label="Current mileage" value={`${(values.mileage ?? 0).toLocaleString('en-US')} mi`} />
              <ReviewRow label="Transmission" value={values.transmission || '—'} />
              <ReviewRow label="Fuel type" value={values.fuelType || '—'} />
              <ReviewRow label="Seats / Doors" value={`${values.seats} seats · ${values.doors} doors`} />
            </div>
          </ReviewSection>

          {hasPerformance && (
            <ReviewSection title="Performance">
              <div className="border-border-soft divide-y divide-[var(--color-border-soft)] border-t">
                {hasValue(values.topSpeedMph) && <ReviewRow label="Top speed" value={`${values.topSpeedMph} mph`} />}
                {hasValue(values.horsepower) && <ReviewRow label="Power" value={`${values.horsepower} hp`} />}
                {hasValue(values.zeroToSixtySec) && <ReviewRow label="0–60 mph" value={`${values.zeroToSixtySec}s`} />}
                {hasValue(values.cylinders) && <ReviewRow label="Cylinders" value={values.cylinders} />}
              </div>
            </ReviewSection>
          )}

          {values.description && (
            <ReviewSection title="Description">
              <p className="text-fg-3 text-[13px]" style={{ textWrap: 'pretty' }}>
                {values.description}
              </p>
            </ReviewSection>
          )}
        </div>

        <div className="flex flex-col">
          <ReviewSection title="Photos" count={values.photos.length}>
            {values.photos.length > 0 ? (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-4">
                {values.photos.map((p, index) => (
                  <div key={p.id} className="border-border relative aspect-square overflow-hidden rounded-[7px] border">
                    <img src={p.url} alt={p.name} className="size-full object-cover" />
                    {index === 0 && (
                      <span className="bg-foreground/70 text-background absolute top-1 left-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-fg-4 text-[13px]">No photos added.</p>
            )}
          </ReviewSection>

          <ReviewSection title="Rate options" count={values.rateOptions.length}>
            {values.rateOptions.length > 0 ? (
              <div className="border-border-soft divide-y divide-[var(--color-border-soft)] border-t">
                {values.rateOptions.map((option) => (
                  <div key={option.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <span className="text-[13px] font-semibold">{option.label || 'Untitled option'}</span>
                    <span className="text-fg-3 flex items-center gap-2.5 text-[12.5px]">
                      <span>{formatRateOptionBasis(option)}</span>
                      <span>·</span>
                      <span>{formatRateOptionMileage(option)}</span>
                      <span className="text-foreground font-semibold">{formatRateOptionPrice(option)}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-fg-4 text-[13px]">No rate options added.</p>
            )}
          </ReviewSection>

          <ReviewSection title="Deposit, fees & tax">
            <div className="border-border-soft divide-y divide-[var(--color-border-soft)] border-t">
              {hasValue(values.deposit) && <ReviewRow label="Security deposit" value={formatCurrency(values.deposit)} />}
              {hasValue(values.overageRatePerMile) && <ReviewRow label="Overage rate" value={`${formatCurrency(values.overageRatePerMile)}/mi`} />}
              {hasValue(values.fuelChargeRate) && <ReviewRow label="Fuel charge" value={`${formatCurrency(values.fuelChargeRate)} / 1/8 tank`} />}
              {hasValue(values.taxRatePct) && <ReviewRow label="Tax rate" value={`${values.taxRatePct}%`} />}
            </div>
          </ReviewSection>
        </div>
      </div>
    </div>
  )
}
