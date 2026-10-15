import { useAuth, useUser } from '@clerk/clerk-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import type { TFunction } from 'i18next'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { FormField } from '@/components/forms/FormField'
import { TimezoneCombobox } from '@/components/forms/TimezoneCombobox'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ONBOARDING_PATHS } from '@/app/layouts/onboarding-steps'
import { AddressPicker } from '@/modules/locations/components/AddressPicker'
import type { AddressPin } from '@/modules/locations/types/location.types'
import { billingKeys, prefetchBilling } from '@/modules/billing/hooks/use-billing'
import { locationApi } from '@/modules/locations/api/location.api'
import { locationKeys } from '@/modules/locations/hooks/use-locations'
import { companyApi } from '@/modules/settings/api/company.api'
import { SubdomainInput } from '@/modules/settings/components/SubdomainInput'
import { companyKeys, useCompany } from '@/modules/settings/hooks/use-company'
import { subdomainSchema } from '@/modules/settings/schema/company.schema'
import type { Company } from '@/modules/settings/types/company.types'
import { companyStepPatch, movedBranch, starterBranch } from '@/modules/settings/utils/company-step.utils'
import { authApi, FLEET_SIZES, toOrganizationMembership, type MeResponse } from '@/services/auth/auth.api'
import { ME_QUERY_KEY, useMe } from '@/services/auth/use-me'
import { useOrganizationStore } from '@/state/organization.store'
import { useSitePreviewStore } from '@/state/site-preview.store'
import { ApiError } from '@/types/api'
import { countryOptions, isCountryCode } from '@/utils/countries'
import { suggestedSubdomain } from '@/utils/slug'
import { browserTimezone, timezoneForCountry } from '@/utils/timezones'
import { StepHeading } from './StepHeading'

function onboardingSchema(t: TFunction<'auth'>) {
  return z.object({
    ownerFullName: z.string().trim().min(1, t('errors.fullNameRequired')),
    tenantName: z.string().trim().min(1, t('errors.companyNameRequired')),
    subdomain: subdomainSchema({
      required: t('errors.subdomainRequired'),
      invalid: t('errors.subdomainInvalid'),
      reserved: t('errors.subdomainReserved'),
    }),
    // Capped at the contact address's length, not a branch's 200: it is saved as both.
    address: z.string().trim().min(1, t('errors.addressRequired')).max(160, t('errors.addressTooLong')),
    country: z.string().refine(isCountryCode, t('errors.countryRequired')),
    fleetSize: z.enum(FLEET_SIZES, t('errors.fleetSizeRequired')),
    timezone: z.string().min(1, t('errors.timezoneRequired')),
  })
}

type OnboardingValues = z.infer<ReturnType<typeof onboardingSchema>>

// The update endpoints' names for the two fields the form names after registration's.
const FORM_FIELD: Record<string, string> = { name: 'tenantName', fullName: 'ownerFullName' }

/** What a return to the step opens on: the company as saved, and the owner's name. */
interface Saved {
  company: Company
  fullName: string
}

/**
 * Second half of sign-up: Clerk has verified who the person is, this creates the
 * company they operate. Reached after `<SignUp />`, and also whenever
 * `/auth/me` reports `user_not_onboarded` — an account interrupted here would
 * otherwise have no way back in. Once the company exists the stepper leads back here,
 * and the same form opens on what was saved and saves what is changed.
 */
export function OnboardingPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const me = useMe()
  // Set once the company exists: the refreshed account then has one, and must not read as a
  // return to the step while this one moves on to the plans.
  const [created, setCreated] = useState(false)
  const membership = me.data?.membership
  const owner = membership?.role === 'owner'
  const returning = Boolean(membership) && !created
  const company = useCompany(returning && owner)

  if (!isLoaded) return <LoadingState />
  if (!isSignedIn) return <Navigate to="/login" replace />
  // Only the owner sets the company up; anyone else already belongs to one.
  if (me.data && !created && !owner) return <Navigate to="/dashboard" replace />
  if (returning && me.data) {
    if (company.isLoading) return <LoadingState />
    if (!company.data) {
      return <ErrorState description={company.error?.message} onRetry={() => void company.refetch()} />
    }
    // Mounted with the saved values rather than filled in after: no frame of an empty form.
    return <CompanyStep saved={{ company: company.data, fullName: me.data.user.fullName }} />
  }
  return <CompanyStep onCreated={() => setCreated(true)} />
}

function CompanyStep({ saved, onCreated }: { saved?: Saved; onCreated?: () => void }) {
  const { t, i18n } = useTranslation('auth')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { userId } = useAuth()
  const { user } = useUser()

  const [formError, setFormError] = useState<string | null>(null)
  // Set once saved, so the button stays busy while the plans' step loads in its place.
  const [leaving, setLeaving] = useState(false)
  // Beside the form rather than in it: the parts are never typed, only replaced with the address.
  const [pin, setPin] = useState<AddressPin>({})
  // Once chosen by hand the country stops following the address: a company can be based in
  // one country and operate in another. On a return every field was already chosen.
  const countryChosen = useRef(Boolean(saved))
  // Likewise the zone: until picked by hand it follows the country, which follows the address.
  const timezoneChosen = useRef(Boolean(saved))
  // And the URL follows the company name until typed; cleared, it follows the name again.
  const subdomainChosen = useRef(Boolean(saved))

  const countries = useMemo(() => countryOptions(i18n.resolvedLanguage ?? 'en'), [i18n.resolvedLanguage])
  const countryNames = useMemo(() => countries.map((c) => c.name), [countries])
  const schema = useMemo(() => onboardingSchema(t), [t])

  const {
    control,
    register,
    handleSubmit,
    getValues,
    setValue,
    setError,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(schema),
    defaultValues: saved
      ? {
          ownerFullName: saved.fullName,
          tenantName: saved.company.name,
          subdomain: saved.company.subdomain,
          address: saved.company.address ?? '',
          country: saved.company.country,
          fleetSize: saved.company.fleetSize,
          timezone: saved.company.timezone,
        }
      : {
          ownerFullName: '',
          tenantName: '',
          subdomain: '',
          address: '',
          country: '',
          fleetSize: undefined,
          timezone: browserTimezone(),
        },
  })

  const country = useWatch({ control, name: 'country' })
  const subdomain = useWatch({ control, name: 'subdomain' })
  const setPreviewSubdomain = useSitePreviewStore((state) => state.setSubdomain)
  useEffect(() => setPreviewSubdomain(subdomain.trim().toLowerCase()), [subdomain, setPreviewSubdomain])
  // Cleared on leaving, so a later visit to the step does not open on the last one's URL.
  useEffect(() => () => setPreviewSubdomain(''), [setPreviewSubdomain])
  const followCountry = (code: string) => {
    if (!timezoneChosen.current) setValue('timezone', timezoneForCountry(getValues('timezone'), code))
  }

  // Google sign-ups hand Clerk a name, so they are not asked for it twice; email sign-ups have none.
  const clerkName = user?.fullName
  useEffect(() => {
    if (clerkName && !getValues('ownerFullName')) setValue('ownerFullName', clerkName)
  }, [clerkName, getValues, setValue])

  /** A return to the step: only what changed is sent, and the starter branch follows its address. */
  const saveChanges = async (values: OnboardingValues, { company, fullName }: Saved) => {
    const name = values.ownerFullName.trim()
    if (name !== fullName) await authApi.updateMe(name)
    const patch = companyStepPatch(values, company)
    if (Object.keys(patch).length === 0) return
    await companyApi.update(patch)
    if (patch.address === undefined) return
    const branch = starterBranch(await locationApi.list('name'), company.address)
    if (branch) await locationApi.update(branch.id, movedBranch(branch, patch.address, pin))
  }

  const onSubmit = async (values: OnboardingValues) => {
    setFormError(null)
    try {
      if (saved) {
        await saveChanges(values, saved)
      } else {
        await authApi.registerTenant({
          tenantName: values.tenantName,
          subdomain: values.subdomain,
          timezone: values.timezone,
          ownerFullName: values.ownerFullName,
          country: values.country,
          fleetSize: values.fleetSize,
          companyAddress: { address: values.address, ...pin },
        })
        onCreated?.()
      }
      setLeaving(true)
      // Both read by the plan step: fetched here, this form stays up until the plans can show.
      // Billing is read again on a return: its recommended plan follows the fleet size.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
        queryClient
          .invalidateQueries({ queryKey: billingKeys.billing })
          .then(() => prefetchBilling(queryClient)),
        saved && queryClient.invalidateQueries({ queryKey: companyKeys.detail }),
        saved && queryClient.invalidateQueries({ queryKey: locationKeys.all }),
      ])
      // What ProtectedRoute would copy in after its first render. That copy is a synchronous update,
      // which cannot wait for the step's code, so it flashed a spinner; done here, nothing does.
      const membership = queryClient.getQueryData<MeResponse>([...ME_QUERY_KEY, userId])?.membership
      if (membership) useOrganizationStore.getState().setMembership(toOrganizationMembership(membership))
      navigate(ONBOARDING_PATHS.plan, { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'subdomain_taken') {
        setError('subdomain', { message: t('errors.subdomainTaken') }, { shouldFocus: true })
        return
      }
      // A 422 names the fields it rejected. Showing only "Request validation failed" left the
      // form with nothing to fix, so each message goes under the field it belongs to.
      const fieldErrors = (error instanceof ApiError ? (error.fieldErrors ?? []) : []).map((e) => ({
        ...e,
        field: FORM_FIELD[e.field] ?? e.field,
      }))
      // The request's keys are the form's names, so the schema says which ones a field shows.
      const placed = fieldErrors.filter(({ field }) => field in schema.shape)
      for (const { field, message } of placed) {
        setError(field as keyof OnboardingValues, { message }, { shouldFocus: true })
      }
      if (placed.length) return
      setFormError(error instanceof Error ? error.message : t('errors.unknown'))
    }
  }

  return (
    <div className="w-full max-w-lg">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <StepHeading title={t('onboarding.title')} className="mb-2">
          {t('onboarding.subtitle')}
        </StepHeading>

        <FormField label={t('onboarding.fullName')} error={errors.ownerFullName?.message} required>
          {(fieldProps) => <Input autoComplete="name" {...register('ownerFullName')} {...fieldProps} />}
        </FormField>

        <FormField label={t('onboarding.companyName')} error={errors.tenantName?.message} required>
          {(fieldProps) => (
            <Input
              autoComplete="organization"
              {...register('tenantName', {
                onChange: (event: ChangeEvent<HTMLInputElement>) => {
                  if (subdomainChosen.current) return
                  setValue('subdomain', suggestedSubdomain(event.target.value), {
                    shouldValidate: isSubmitted,
                  })
                },
              })}
              {...fieldProps}
            />
          )}
        </FormField>

        <FormField
          label={t('onboarding.subdomain')}
          description={t('onboarding.subdomainHelp')}
          error={errors.subdomain?.message}
          required
        >
          {(fieldProps) => (
            <SubdomainInput
              {...register('subdomain', {
                onChange: (event: ChangeEvent<HTMLInputElement>) => {
                  subdomainChosen.current = event.target.value !== ''
                },
              })}
              {...fieldProps}
            />
          )}
        </FormField>

        <FormField label={t('onboarding.address')} error={errors.address?.message} required>
          {({ id, invalid, 'aria-describedby': describedBy }) => (
            <Controller
              control={control}
              name="address"
              render={({ field }) => (
                <AddressPicker
                  id={id}
                  invalid={invalid}
                  describedBy={describedBy}
                  value={field.value}
                  onChange={(address, parts) => {
                    field.onChange(address)
                    setPin(parts)
                    if (parts.country && isCountryCode(parts.country) && !countryChosen.current) {
                      setValue('country', parts.country, { shouldValidate: true })
                      followCountry(parts.country)
                    }
                  }}
                />
              )}
            />
          )}
        </FormField>

        <FormField label={t('onboarding.country')} error={errors.country?.message} required>
          {(fieldProps) => (
            <Controller
              control={control}
              name="country"
              render={({ field }) => (
                <Combobox
                  options={countryNames}
                  // The form holds the ISO code; the combobox shows the localized name.
                  value={countries.find((c) => c.code === field.value)?.name ?? ''}
                  onChange={(name) => {
                    countryChosen.current = true
                    const code = countries.find((c) => c.name === name)?.code ?? ''
                    field.onChange(code)
                    followCountry(code)
                  }}
                  {...fieldProps}
                />
              )}
            />
          )}
        </FormField>

        <FormField label={t('onboarding.timezone')} error={errors.timezone?.message} required>
          {(fieldProps) => (
            <Controller
              control={control}
              name="timezone"
              render={({ field }) => (
                <TimezoneCombobox
                  country={country}
                  value={field.value}
                  onChange={(zone) => {
                    timezoneChosen.current = true
                    field.onChange(zone)
                  }}
                  {...fieldProps}
                />
              )}
            />
          )}
        </FormField>

        <FormField label={t('onboarding.fleetSize')} error={errors.fleetSize?.message} required>
          {(fieldProps) => (
            <Controller
              control={control}
              name="fleetSize"
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger {...fieldProps}>
                    <SelectValue placeholder={t('onboarding.fleetSizePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {FLEET_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {t(`onboarding.fleetSizes.${size}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
        </FormField>

        {formError && (
          <p role="alert" className="text-caption text-error">
            {formError}
          </p>
        )}

        {/* Busy until the next step replaces this one: it can stay on screen while that step's code
            loads, and a second click would register the company again. */}
        <Button type="submit" loading={isSubmitting || leaving} className="mt-2 w-full">
          {t('onboarding.submit')}
        </Button>
      </form>
    </div>
  )
}
