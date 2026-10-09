import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, CheckCircle2, CircleSlash, Paperclip, Save, UserPlus, X } from 'lucide-react'
import { MAX_PAGE_SIZE } from '@/lib/pagination'
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
import { useAgreementTemplates } from '@/modules/contracts/hooks/use-agreement-templates'
import { draftTemplateId, lostDraftTerms } from '@/modules/contracts/utils/agreement-template.utils'
import { PageHeader } from '@/components/layout/PageHeader'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { useFormatters } from '@/i18n'
import { useLocationNames } from '@/modules/locations/hooks/use-locations'
import {
  customerKeys,
  useCustomerDocuments,
  useCustomerSearch,
} from '@/modules/customers/hooks/use-customers'
import { DocumentOnFile } from '@/modules/customers/components/DocumentOnFile'
import type { Customer, DocumentKind } from '@/modules/customers/types/customer.types'
import {
  ACCEPTED_DOCUMENT_TYPES,
  uploadCustomerDocument,
} from '@/modules/customers/api/customer-document.api'
import { ReviewRow, ReviewRowGrid, ReviewSection } from '@/modules/vehicles/components/ReviewSummary'
import { useVehicles } from '@/modules/vehicles/hooks/use-vehicles'
import type { Vehicle } from '@/modules/vehicles/types/vehicle.types'
import { formatPlanLines, planLineNames, vehicleDisplayName } from '@/modules/vehicles/utils/vehicle.utils'
import { AdditionalDriversEditor } from '@/modules/bookings/components/AdditionalDriversEditor'
import { BookingFeesEditor } from '@/modules/bookings/components/BookingFeesEditor'
import { BookingVerificationStatus } from '@/modules/bookings/components/BookingVerificationStatus'
import {
  useVerificationReportByEmail,
  useOrderCustomerVerification,
  useInsuranceLinkDialog,
  useInsuranceResults,
  useVerificationByEmail,
} from '@/modules/bookings/hooks/use-verification'
import { insuranceReturnUri } from '@/modules/bookings/utils/booking.insurance-redirect'
import { InsuranceLinkDialog } from '@/modules/bookings/components/InsuranceLinkDialog'
import type { InsuranceOrderWire } from '@/modules/bookings/api/booking.mapper'
import { customerLabel, customerSearchTerm } from '@/modules/bookings/utils/booking.customer-search'
import { BookingPriceSummary } from '@/modules/bookings/components/BookingPriceSummary'
import { BookingRatePlan } from '@/modules/bookings/components/BookingRatePlan'
import { BookingVehiclePicker, type VehicleOption } from '@/modules/bookings/components/BookingVehiclePicker'
import { useBookingSchedule, useCreateBooking } from '@/modules/bookings/hooks/use-bookings'
import {
  useBookingDrafts,
  useDeleteBookingDraft,
  useSaveBookingDraft,
} from '@/modules/bookings/hooks/use-booking-drafts'
import { resolveDraftResume } from '@/modules/bookings/utils/booking.draft-resume'
import { conflictsForVehicle } from '@/modules/bookings/utils/booking.schedule'
import { verificationForRenter, type RanVerification } from '@/modules/bookings/utils/booking.verification'
import {
  BOOKING_STEP_FIELDS,
  bookingFormSchema,
  combineDateTime,
  type BookingFormValues,
} from '@/modules/bookings/schema/booking.schema'
import type { BookedInterval, BookingInput } from '@/modules/bookings/types/booking.types'
import { durationHours, priceBooking } from '@/modules/bookings/utils/booking.pricing'
import { defaultTripWindow, toDateInput } from '@/modules/bookings/utils/booking.trip-defaults'
import { BOOKING_TIME_STEP_MINUTES } from '@/modules/bookings/constants/booking.constants'

const STEP_KEYS = ['trip', 'renter', 'pricing', 'review'] as const
type StepKey = (typeof STEP_KEYS)[number]

/**
 * One page of the fleet to pick from. 100 is the most `GET /vehicles` allows — asking for more
 * is a 422, not a larger page — so a tenant past that many available cars at one branch will
 * need the picker to page or search rather than listing everything.
 */
const FLEET_PAGE_SIZE = MAX_PAGE_SIZE

/** Stable empty default so an unresolved bookings query doesn't churn identity every render. */
const EMPTY_SCHEDULE: BookedInterval[] = []

const TODAY_INPUT = toDateInput(new Date())

/** Wide enough for any adult renter — the DOB picker pages by dropdown, not month by month. */
const DOB_YEAR_RANGE = { from: new Date().getFullYear() - 100, to: new Date().getFullYear() }

function blankValues(): BookingFormValues {
  return {
    pickupLocation: '',
    returnLocation: '',
    ...defaultTripWindow(new Date()),
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
    verifications: [],
    additionalDrivers: [],
    fees: [],
  }
}

/**
 * A saved draft may predate a field being added, so it is merged over a blank form rather
 * than trusted wholesale. Attachments never survive a draft — a File cannot be serialized —
 * so they are always reset.
 */
function fromDraftPayload(payload: Record<string, unknown>): BookingFormValues {
  return {
    ...blankValues(),
    ...(payload as Partial<BookingFormValues>),
    licenceDocument: null,
    insuranceDocument: null,
  }
}

/**
 * Resolves `?draft=<id>` before the wizard mounts.
 *
 * react-hook-form reads `defaultValues` once, so the form cannot be built until the draft it
 * is resuming has arrived — mounting first and filling in afterwards would leave the counter
 * looking at a blank form that silently rewrites itself.
 */
export function BookingFormPage() {
  const { t } = useTranslation('bookings')
  const navigate = useNavigate()
  const [resumedDraftId] = useState(() => new URLSearchParams(window.location.search).get('draft'))
  const { data: draftPage, isLoading, isError, refetch } = useBookingDrafts()

  const resume = resolveDraftResume(resumedDraftId, draftPage?.items, { isLoading, isError })

  if (resume.kind === 'loading') {
    return (
      <PageContainer>
        <LoadingState label={t('form.draft.loading')} />
      </PageContainer>
    )
  }

  // Opening the wizard here would hand it a blank form, and saving that creates a second
  // draft rather than updating the one the counter meant to resume.
  if (resume.kind === 'failed') {
    return (
      <PageContainer>
        <ErrorState description={t('form.draft.loadError')} onRetry={() => refetch()} />
      </PageContainer>
    )
  }

  if (resume.kind === 'missing') {
    return (
      <PageContainer>
        <ErrorState
          title={t('form.draft.missingTitle')}
          description={t('form.draft.missing')}
          actionLabel={t('form.draft.startFresh')}
          onRetry={() => navigate('/bookings/new', { replace: true })}
        />
      </PageContainer>
    )
  }

  const draft = resume.kind === 'resume' ? resume.draft : undefined

  return (
    // Remounts if the draft changes, so the form rebuilds its defaults rather than keeping
    // the values of whichever draft it opened with.
    <BookingWizard
      key={draft?.id ?? 'new'}
      draftId={draft?.id}
      initialValues={draft ? fromDraftPayload(draft.payload) : null}
      savedTemplateId={draftTemplateId(draft?.payload)}
    />
  )
}

interface BookingWizardProps {
  draftId?: string
  /** Null for a fresh booking; the resumed draft's values otherwise. */
  initialValues: BookingFormValues | null
  /** The terms an older draft picked here, before they were picked on the booking itself. */
  savedTemplateId?: string
}

function BookingWizard({ draftId, initialValues, savedTemplateId }: BookingWizardProps) {
  const { t } = useTranslation('bookings')
  const { t: tCommon } = useTranslation('common')
  const { t: tValidation } = useTranslation('validation')
  const { t: tVehicles } = useTranslation('vehicles')
  const format = useFormatters()
  const navigate = useNavigate()
  const createBooking = useCreateBooking()
  const saveDraft = useSaveBookingDraft()
  const deleteDraft = useDeleteBookingDraft({ silent: true })
  const queryClient = useQueryClient()
  const locations = useLocationNames()
  // Read only for a draft that named its terms: the booking no longer starts on them, and
  // the counter has to be told before creating it rather than find out on the agreement.
  const { data: templates } = useAgreementTemplates(Boolean(savedTemplateId))
  const lostTerms = lostDraftTerms(savedTemplateId, templates)

  const [stepIndex, setStepIndex] = useState(0)
  const [furthestIndex, setFurthestIndex] = useState(0)

  const [stepValidationAttempted, setStepValidationAttempted] = useState<Record<number, boolean>>({})
  const resumedDraftId = draftId
  const restoredDraft = initialValues

  /**
   * The lookup box holds its own text, deliberately *not* bound to `customerName`. Sharing one
   * value made the two fields mirror each other, so typing a new renter's name below echoed
   * into the search above. Seeded only when a draft was linked to a real customer.
   */
  // Seeded from the draft's own name: the matching customer has not loaded yet, so the label
  // cannot be rebuilt here. Picking anyone replaces it with the disambiguated form.
  const [customerQuery, setCustomerQuery] = useState(
    restoredDraft?.customerId ? restoredDraft.customerName : '',
  )

  const [returnElsewhere, setReturnElsewhere] = useState(
    Boolean(
      restoredDraft &&
      restoredDraft.returnLocation &&
      restoredDraft.returnLocation !== restoredDraft.pickupLocation,
    ),
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

  // Only vehicles that can actually be rented: published, Available, and sitting at the pickup
  // branch. Before a location is chosen the whole available fleet is shown.
  const { data, isLoading, isError, refetch } = useVehicles({
    status: 'Available',
    location: values.pickupLocation || 'All',
    // Drafts are a separate resource now, so the vehicles list never includes them.
    page: 1,
    pageSize: FLEET_PAGE_SIZE,
  })

  // Only the bookings touching this window — the API does the overlap filtering.
  const { data: scheduleData, isReady: scheduleReady } = useBookingSchedule(pickupAt, returnAt, hours > 0)
  // Availability is only meaningful once the schedule describes the dates on screen: until it
  // has loaded, an empty list would mark every car free and let a booked one be picked.
  const schedule = scheduleData ?? EMPTY_SCHEDULE

  // The lookup box searches the customer book as the counter types. On the name alone: the
  // box may be showing a picked renter's full label, which no single column can match.
  const { data: customerMatches = [] } = useCustomerSearch(customerSearchTerm(customerQuery))

  /** The renter chosen from the list, so re-picking them does not depend on a refetched page. */
  const [picked, setPicked] = useState<Customer | undefined>()

  // The book is capped at a page, so a renter found by typing can fall outside it once the
  // search goes blank. Keeping them listed is what puts the tick beside the current choice.
  const customerOptions = useMemo(() => {
    const labels = customerMatches.map(customerLabel)
    const chosen = picked && customerLabel(picked)
    return chosen && !labels.includes(chosen) ? [chosen, ...labels] : labels
  }, [customerMatches, picked])

  /**
   * Scans a returning renter already has. Documents belong to the customer, not to one rental,
   * so a licence uploaded on an earlier booking is still on file for this one — showing the
   * empty picker instead would invite a second copy of the same document.
   */
  const { data: existingDocuments = [] } = useCustomerDocuments(values.customerId || undefined)

  const { data: customerVerification, isFetching: loadingVerification } = useVerificationByEmail(
    values.customerEmail,
  )
  const orderVerification = useOrderCustomerVerification()

  /**
   * A check run here, before the renter has a customer id to re-read it by.
   *
   * Tagged with the email it was ordered for: without that, switching to a different renter
   * left the previous one's verdict on the card while the report button fetched the new
   * renter's — one person's result shown as another's.
   */
  const [ranVerification, setRanVerification] = useState<RanVerification | undefined>()
  const verification = verificationForRenter(customerVerification, ranVerification, values.customerEmail)
  // By email, the same key the card and ordering use: a renter screened at the counter has
  // no customer record to fetch a report by until they book.
  const verificationReport = useVerificationReportByEmail(values.customerEmail.trim() || undefined)

  /**
   * Why a check cannot be run yet, naming the fields still empty. Checkr matches on name and
   * date of birth; the email is what the renter resolves to, so all three are required.
   */
  const runBlockedReason =
    values.customerName.trim() && values.customerEmail.trim() && values.customerDob
      ? undefined
      : t('verification.background.needsRenter')

  function handleRunCheck() {
    const email = values.customerEmail.trim().toLowerCase()

    // The hook reports a failure as a toast, so nothing is thrown at the form here.
    orderVerification.mutate(
      // Only what the check matches on, plus the email that says who it is for. The rest of
      // the form is not sent: a check is not an edit, and the API refuses anything else.
      {
        name: values.customerName,
        email: values.customerEmail,
        dateOfBirth: values.customerDob,
      },
      { onSuccess: (result) => setRanVerification({ email, verification: result }) },
    )
  }

  const { data: insurance, isFetching: loadingInsurance } = useVerificationByEmail(
    values.customerEmail,
    'insurance',
  )
  useInsuranceResults()
  const insuranceLink = useInsuranceLinkDialog()

  /** The session to send the renter; asking again while it is open returns the same link. */
  const insuranceOrder = (): InsuranceOrderWire => ({
    name: values.customerName.trim(),
    email: values.customerEmail.trim().toLowerCase(),
    dateOfBirth: values.customerDob,
    redirectUri: insuranceReturnUri(window.location),
  })

  /** Slots the counter has chosen to replace, so the picker takes over from what is on file. */
  const [replacing, setReplacing] = useState<{ licence?: boolean; insurance?: boolean }>({})

  const documentOnFile = (kind: DocumentKind) =>
    replacing[kind] ? undefined : existingDocuments.find((d) => d.kind === kind)

  const options: VehicleOption[] = (data?.items ?? []).map((vehicle) => {
    const clash = scheduleReady ? conflictsForVehicle(schedule, vehicle.id, pickupAt, returnAt)[0] : undefined
    return { vehicle, bookedUntil: clash?.to }
  })

  const freeVehicles = options.filter((o) => !o.bookedUntil).map((o) => o.vehicle)
  const selectedVehicle = freeVehicles.find((v) => v.id === values.vehicleId)

  // Changing the branch or the dates can strand the chosen vehicle — drop the selection rather
  // than silently booking a car from the wrong location, or one that's now double-booked.
  const selectionStranded = Boolean(values.vehicleId) && !isLoading && !selectedVehicle
  useEffect(() => {
    if (!selectionStranded) return
    setValue('vehicleId', '', { shouldValidate: false })
  }, [selectionStranded, setValue])

  // The cost engine picks the rates; the API re-prices on create with the same rules.
  const pricing = selectedVehicle
    ? priceBooking({
        vehicle: selectedVehicle,
        pickupAt,
        returnAt,
        additionalDrivers: values.additionalDrivers,
        fees: values.fees,
      })
    : null

  /**
   * Documents this booking will have, for the chips on the Review step: the ones just picked,
   * plus whatever the renter already has on file. A returning renter whose licence is on file
   * has a licence — showing nothing there would read as though it were missing.
   */
  const attachedDocuments = (['licence', 'insurance'] as const)
    .filter((kind) => {
      const picked = kind === 'licence' ? values.licenceDocument : values.insuranceDocument
      return Boolean(picked) || Boolean(documentOnFile(kind))
    })
    .map((kind) => t(`form.documents.${kind}`))

  const goNext = async () => {
    setStepValidationAttempted((attempted) => ({ ...attempted, [stepIndex]: true }))
    const fields = BOOKING_STEP_FIELDS[stepKey]
    const valid = fields.length === 0 ? true : await trigger(fields as (keyof BookingFormValues)[])
    if (!valid) return
    // A vehicle with no rates has no price; the rate card already says why.
    if (stepKey === 'pricing' && !pricing) return
    const next = Math.min(stepIndex + 1, STEP_KEYS.length - 1)
    setStepIndex(next)
    setFurthestIndex((f) => Math.max(f, next))
  }

  const goPrev = () => setStepIndex((i) => Math.max(i - 1, 0))

  const cancel = () => navigate('/bookings')

  function handleSaveDraft() {
    // Attachments are left out: a File cannot be serialized, so the API would store `{}` and
    // the draft would come back holding a broken one. The counter re-picks the scans when
    // they resume, which is why the toast says so.
    const { licenceDocument, insuranceDocument, ...payload } = values
    const hadDocuments = Boolean(licenceDocument || insuranceDocument)

    // Updating when resuming, creating otherwise — so returning to a draft does not leave a
    // second copy of it behind every time it is saved.
    saveDraft.mutate(
      { id: resumedDraftId ?? undefined, payload: payload as Record<string, unknown> },
      {
        onSuccess: () => {
          toast({
            title: t('form.draft.saved'),
            description: hadDocuments
              ? t('form.draft.savedWithoutDocuments')
              : t('form.draft.savedDescription'),
            variant: 'success',
          })
          navigate('/bookings')
        },
      },
    )
  }

  function handleSelectVehicle(vehicle: Vehicle) {
    setValue('vehicleId', vehicle.id, { shouldValidate: true })
  }

  function handlePickCustomer(label: string) {
    const match =
      customerMatches.find((c) => customerLabel(c) === label) ??
      (picked && customerLabel(picked) === label ? picked : undefined)
    const opts = { shouldValidate: true, shouldDirty: true } as const
    // Free text stays as typed; a picked renter shows the label so the choice stays visible.
    setCustomerQuery(label)
    setValue('customerName', match?.name ?? label, opts)
    setValue('customerId', match?.id ?? '', opts)
    setPicked(match)
    if (!match) return
    setValue('customerEmail', match.email, opts)
    setValue('customerPhone', match.phone, opts)
    setValue('customerDob', match.dateOfBirth ?? '', opts)
    setValue('customerAddress', match.address ?? '', opts)
    setValue('licenceNumber', match.licenceNumber, opts)
    setValue('licenceExpiry', match.licenceExpiry ?? '', opts)
    // A different renter has a different set of scans on file.
    setReplacing({})
  }

  /** Clears a prefilled renter so the next one is typed from scratch rather than edited over. */
  function handleNewCustomer() {
    setCustomerQuery('')
    setPicked(undefined)
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
    setReplacing({})
  }

  /**
   * Sends whichever scans were attached. Failures are surfaced but never rethrown: the booking
   * is already made, and losing it because a scan did not upload would be the worse outcome.
   * The counter can re-attach from the renter's record.
   */
  async function uploadDocuments(customerId: string, submitted: BookingFormValues) {
    const attachments = [
      { kind: 'licence' as const, picked: submitted.licenceDocument },
      { kind: 'insurance' as const, picked: submitted.insuranceDocument },
    ].filter((a) => a.picked != null)
    if (attachments.length === 0) return

    const failed: string[] = []
    for (const { kind, picked } of attachments) {
      try {
        await uploadCustomerDocument(customerId, kind, picked!.file)
      } catch {
        failed.push(t(`form.documents.${kind}`))
      }
    }
    // The booking mutation invalidated this customer before these uploads ran, so their
    // documents are cached as they were a moment ago — a replaced scan would keep showing the
    // old row (and a 404 thumbnail) until the entry went stale. Refresh once they have landed.
    await queryClient.invalidateQueries({ queryKey: customerKeys.documents(customerId) })

    if (failed.length > 0) {
      toast({
        title: t('form.documents.uploadFailed'),
        description: t('form.documents.uploadFailedDescription', { documents: failed.join(', ') }),
        variant: 'error',
      })
    }
  }

  const onSubmit = (submitted: BookingFormValues) =>
    new Promise<void>((settle) => {
      if (!selectedVehicle || !pricing) return settle()

      const input: BookingInput = {
        customerId: submitted.customerId || undefined,
        customer: {
          name: submitted.customerName,
          email: submitted.customerEmail,
          phone: submitted.customerPhone,
          dateOfBirth: submitted.customerDob || undefined,
          address: submitted.customerAddress || undefined,
          licenceNumber: submitted.licenceNumber,
          licenceExpiry: submitted.licenceExpiry || undefined,
        },
        vehicleId: selectedVehicle.id,
        pickupLocation: submitted.pickupLocation,
        returnLocation: submitted.returnLocation,
        pickupAt: combineDateTime(submitted.pickupDate, submitted.pickupTime).toISOString(),
        returnAt: combineDateTime(submitted.returnDate, submitted.returnTime).toISOString(),
        additionalDrivers: submitted.additionalDrivers,
        fees: submitted.fees,
        verifications: submitted.verifications,
      }

      // Wrapped in a promise so the button stays busy through the uploads too — RHF keeps
      // isSubmitting true until onSubmit settles, and the scans are part of "creating".
      createBooking.mutate(input, {
        onSuccess: async (booking) => {
          // Awaited, and before navigating: a draft left behind can be resumed and submitted
          // again, which books the car twice. If it fails the counter is told to discard it.
          if (resumedDraftId) {
            try {
              await deleteDraft.mutateAsync(resumedDraftId)
            } catch {
              toast({
                title: t('form.draft.notDiscardedTitle'),
                description: t('form.draft.notDiscarded', { reference: booking.reference }),
                variant: 'error',
              })
            }
          }
          // Documents hang off the customer, who only exists once the booking has been taken,
          // so the scans go up now against the id the API just resolved. A failed scan must not
          // discard a booking that was made: it is reported on its own and the booking stands.
          await uploadDocuments(booking.customer.id, submitted)
          settle()
          navigate('/bookings')
        },
        onError: () => settle(),
      })
    })

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
            if (
              e.key === 'Enter' &&
              stepKey !== 'review' &&
              (e.target as HTMLElement).tagName !== 'TEXTAREA'
            ) {
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
                    <FormField
                      label={t('form.fields.pickupLocation')}
                      error={errors.pickupLocation?.message}
                      required
                    >
                      {({ id }) => (
                        <Controller
                          control={control}
                          name="pickupLocation"
                          render={({ field }) => (
                            <div className="flex flex-col gap-1.5">
                              <Select
                                value={field.value}
                                onValueChange={(next) => {
                                  field.onChange(next)
                                  // The return branch only diverges on request — otherwise it tracks pickup.
                                  if (!returnElsewhere)
                                    setValue('returnLocation', next, { shouldValidate: true })
                                }}
                                disabled={locations.isLoading || locations.isError}
                              >
                                <SelectTrigger id={id} aria-invalid={Boolean(errors.pickupLocation)}>
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
                              {/* A booking must name a branch, so a failed load has to offer a way
                                  forward instead of an empty, silent dropdown. */}
                              {locations.isError && (
                                <p className="text-error text-caption m-0 flex items-center gap-1.5">
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
                              {!locations.isLoading && !locations.isError && locations.names.length === 0 && (
                                <p className="text-fg-3 text-caption m-0">{t('form.fields.locationEmpty')}</p>
                              )}
                            </div>
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
                          setValue('returnLocation', on ? '' : values.pickupLocation, {
                            shouldValidate: true,
                          })
                        }}
                      />
                      {t('form.fields.returnElsewhere')}
                    </label>
                  </div>

                  <FormField
                    label={t('form.fields.returnLocation')}
                    error={errors.returnLocation?.message}
                    required
                  >
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="returnLocation"
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={!returnElsewhere || locations.isLoading || locations.isError}
                          >
                            <SelectTrigger id={id} aria-invalid={Boolean(errors.returnLocation)}>
                              <SelectValue placeholder={t('form.fields.locationPlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                              {locations.names.map((name) => (
                                <SelectItem key={name} value={name}>
                                  {name}
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
                    <FormField
                      label={t('form.fields.pickupDate')}
                      error={errors.pickupDate?.message}
                      required
                    >
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
                    <FormField
                      label={t('form.fields.pickupTime')}
                      error={errors.pickupTime?.message}
                      required
                    >
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
                              minuteStep={BOOKING_TIME_STEP_MINUTES}
                              invalid={invalid}
                            />
                          )}
                        />
                      )}
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      label={t('form.fields.returnDate')}
                      error={errors.returnDate?.message}
                      required
                    >
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
                    <FormField
                      label={t('form.fields.returnTime')}
                      error={errors.returnTime?.message}
                      required
                    >
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
                              minuteStep={BOOKING_TIME_STEP_MINUTES}
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
                          options={customerOptions}
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
                  <FormField
                    label={t('form.fields.customerName')}
                    error={errors.customerName?.message}
                    required
                  >
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
                  <FormField
                    label={t('form.fields.customerEmail')}
                    error={errors.customerEmail?.message}
                    required
                  >
                    {(fieldProps) => <Input type="email" {...register('customerEmail')} {...fieldProps} />}
                  </FormField>
                  <FormField
                    label={t('form.fields.customerPhone')}
                    error={errors.customerPhone?.message}
                    required
                  >
                    {(fieldProps) => <Input type="tel" {...register('customerPhone')} {...fieldProps} />}
                  </FormField>
                  <FormField
                    label={t('form.fields.customerDob')}
                    error={errors.customerDob?.message}
                    required
                  >
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
                    required
                    className="md:col-span-2"
                  >
                    {(fieldProps) => (
                      <Input
                        placeholder={t('form.fields.customerAddressPlaceholder')}
                        {...register('customerAddress')}
                        {...fieldProps}
                      />
                    )}
                  </FormField>
                </div>
              </Card>

              <Card as="section" className="p-[18px]">
                <PanelHeading title={t('form.sections.documents')} description={t('form.documents.hint')} />

                <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
                  <FormField
                    label={t('form.fields.licenceNumber')}
                    error={errors.licenceNumber?.message}
                    required
                  >
                    {(fieldProps) => (
                      <Input className="font-mono" {...register('licenceNumber')} {...fieldProps} />
                    )}
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

                  <FormField
                    label={t('form.documents.licence')}
                    description={t('form.documents.licenceHint')}
                  >
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="licenceDocument"
                        render={({ field }) =>
                          // What the renter already has on file, unless a replacement has been
                          // picked — then the new file takes over the slot and will replace it.
                          documentOnFile('licence') && !field.value ? (
                            <DocumentOnFile
                              customerId={values.customerId}
                              document={documentOnFile('licence')!}
                              onReplace={() => setReplacing((r) => ({ ...r, licence: true }))}
                            />
                          ) : (
                            <DocumentUpload
                              id={id}
                              label={t('form.documents.licence')}
                              value={field.value}
                              onChange={field.onChange}
                              accept={ACCEPTED_DOCUMENT_TYPES.join(',')}
                            />
                          )
                        }
                      />
                    )}
                  </FormField>
                  <FormField
                    label={t('form.documents.insurance')}
                    description={t('form.documents.insuranceHint')}
                  >
                    {({ id }) => (
                      <Controller
                        control={control}
                        name="insuranceDocument"
                        render={({ field }) =>
                          // What the renter already has on file, unless a replacement has been
                          // picked — then the new file takes over the slot and will replace it.
                          documentOnFile('insurance') && !field.value ? (
                            <DocumentOnFile
                              customerId={values.customerId}
                              document={documentOnFile('insurance')!}
                              onReplace={() => setReplacing((r) => ({ ...r, insurance: true }))}
                            />
                          ) : (
                            <DocumentUpload
                              id={id}
                              label={t('form.documents.insurance')}
                              value={field.value}
                              onChange={field.onChange}
                              accept={ACCEPTED_DOCUMENT_TYPES.join(',')}
                            />
                          )
                        }
                      />
                    )}
                  </FormField>
                </div>
              </Card>

              <Card as="section" className="p-[18px]">
                <PanelHeading
                  title={t('form.sections.verification')}
                  description={t('form.verification.hint')}
                />
                <div className="mt-4">
                  <BookingVerificationStatus
                    verification={verification}
                    loading={loadingVerification}
                    onRunCheck={handleRunCheck}
                    running={orderVerification.isPending}
                    runBlockedReason={runBlockedReason}
                    onViewReport={verification ? () => verificationReport.open() : undefined}
                    openingReport={verificationReport.isPending}
                  />
                </div>
                <div className="mt-3">
                  <BookingVerificationStatus
                    kind="insurance"
                    verification={insurance}
                    loading={loadingInsurance}
                    returnOn={values.returnDate}
                    onShare={() => insuranceLink.share(insuranceOrder())}
                    sharing={insuranceLink.sharing}
                    runBlockedReason={runBlockedReason && t('verification.insurance.needsRenter')}
                  />
                  <InsuranceLinkDialog
                    {...insuranceLink.dialog}
                    renterName={values.customerName.trim()}
                    defaultEmail={values.customerEmail.trim()}
                    defaultPhone={values.customerPhone.trim()}
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
                      <BookingRatePlan plan={pricing?.plan ?? null} />
                    ) : (
                      <p className="text-fg-4 text-[14px]">{t('form.review.noVehicle')}</p>
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
                          showAllErrors={Boolean(stepValidationAttempted[stepIndex])}
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
                        <BookingFeesEditor
                          value={field.value}
                          onChange={field.onChange}
                          errors={errors.fees}
                          showAllErrors={Boolean(stepValidationAttempted[stepIndex])}
                        />
                      )}
                    />
                  </div>
                </Card>
              </div>

              {pricing && <BookingPriceSummary pricing={pricing} className="xl:sticky xl:top-4" />}
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
                      <ReviewRow
                        label={t('form.review.vehicleName')}
                        value={vehicleDisplayName(selectedVehicle)}
                      />
                      <ReviewRow label={t('form.review.plate')} value={selectedVehicle.plate} />
                      {/* The rates the engine chose; what they cost lives in the breakdown panel. */}
                      <ReviewRow
                        label={t('form.review.rate')}
                        value={pricing ? formatPlanLines(planLineNames(pricing.plan.lines), tVehicles) : '—'}
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
                  count={[verification, insurance].filter(Boolean).length}
                  onEdit={() => setStepIndex(1)}
                >
                  {verification || insurance ? (
                    <div className="flex flex-col gap-3">
                      {verification && <BookingVerificationStatus verification={verification} />}
                      {insurance && <BookingVerificationStatus kind="insurance" verification={insurance} />}
                    </div>
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
                        <li
                          key={driver.id}
                          className="text-fg-2 flex flex-wrap items-baseline justify-between gap-x-2 text-[14px]"
                        >
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
                  <ReviewSection
                    title={t('form.review.fees')}
                    count={values.fees.length}
                    onEdit={() => setStepIndex(2)}
                  >
                    <ul className="flex flex-col gap-1.5">
                      {values.fees.map((fee) => (
                        <li
                          key={fee.id}
                          className="text-fg-2 flex items-baseline justify-between gap-2 text-[14px]"
                        >
                          <span>{fee.label || '—'}</span>
                          <span className="text-fg-4 shrink-0 tabular-nums">
                            {format.currency(fee.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </ReviewSection>
                )}

                {lostTerms && (
                  <p role="status" className="bg-warning-tint m-0 rounded-[10px] px-3.5 py-3 text-[13px]">
                    {lostTerms.name
                      ? t('form.review.termsNotKept', { name: lostTerms.name })
                      : t('form.review.termsNotKeptUnnamed')}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3.5">
                {pricing ? (
                  <BookingPriceSummary pricing={pricing} className="xl:sticky xl:top-4" />
                ) : (
                  <ReviewSection title={t('form.summary.title')} onEdit={() => setStepIndex(2)}>
                    <p className="text-fg-4 text-[14px]">{t('form.review.noVehicle')}</p>
                  </ReviewSection>
                )}
              </div>
            </div>
          )}

          <Card as="section" className="flex flex-wrap items-center gap-3 p-3.5">
            {/* Back first: it is the one most reached for, and it reads left-to-right as the
                reverse of Continue on the other end of the row. */}
            {stepIndex > 0 && (
              <Button type="button" variant="outline" onClick={goPrev} className="gap-1.5">
                <ArrowLeft className="size-4" aria-hidden />
                {t('form.nav.previousStep')}
              </Button>
            )}

            <Button type="button" variant="outline" size="sm" onClick={cancel} className="h-9 gap-1.5">
              <X className="size-4" aria-hidden />
              {tCommon('actions.cancel')}
            </Button>

            <div className="flex-1" />

            <Button type="button" variant="outline" onClick={handleSaveDraft} className="gap-1.5">
              <Save className="size-4" aria-hidden />
              {t('form.draft.save')}
            </Button>

            {stepKey !== 'review' ? (
              <Button
                type="button"
                onClick={goNext}
                // Leaving the trip step commits to a vehicle, so wait for availability that
                // describes the chosen dates rather than the ones before the last edit.
                loading={stepKey === 'trip' && hours > 0 && !scheduleReady}
                className="gap-1.5"
              >
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
