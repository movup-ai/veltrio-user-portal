import { useAuth, useUser } from '@clerk/clerk-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import type { TFunction } from 'i18next'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { FormField } from '@/components/forms/FormField'
import { TimezoneCombobox } from '@/components/forms/TimezoneCombobox'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ONBOARDING_PATHS } from '@/app/layouts/onboarding-steps'
import { AddressPicker } from '@/modules/locations/components/AddressPicker'
import type { AddressPin } from '@/modules/locations/types/location.types'
import { authApi, FLEET_SIZES, type RegisterTenantPayload } from '@/services/auth/auth.api'
import { ME_QUERY_KEY, useMe } from '@/services/auth/use-me'
import { ApiError } from '@/types/api'
import { countryOptions, isCountryCode } from '@/utils/countries'
import { isValidWebsite, SUBDOMAIN_ATTEMPTS, subdomainFor } from '@/utils/slug'
import { browserTimezone, timezoneForCountry } from '@/utils/timezones'
import { StepHeading } from './StepHeading'

/**
 * Registers under the company name's own subdomain, moving to -2, -3… while one is taken.
 * The form has no subdomain field, so a clash is not something the user could fix.
 */
async function registerWithFreeSubdomain(payload: Omit<RegisterTenantPayload, 'subdomain'>) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await authApi.registerTenant({
        ...payload,
        subdomain: subdomainFor(payload.tenantName, attempt),
      })
    } catch (error) {
      const taken = error instanceof ApiError && error.code === 'subdomain_taken'
      if (!taken || attempt + 1 >= SUBDOMAIN_ATTEMPTS) throw error
    }
  }
}

function onboardingSchema(t: TFunction<'auth'>) {
  return z.object({
    ownerFullName: z.string().trim().min(1, t('errors.fullNameRequired')),
    tenantName: z.string().trim().min(1, t('errors.companyNameRequired')),
    website: z.string().trim().refine(isValidWebsite, t('errors.websiteInvalid')),
    // Capped at the contact address's length, not a branch's 200: it is saved as both.
    address: z.string().trim().min(1, t('errors.addressRequired')).max(160, t('errors.addressTooLong')),
    country: z.string().refine(isCountryCode, t('errors.countryRequired')),
    fleetSize: z.enum(FLEET_SIZES, t('errors.fleetSizeRequired')),
    timezone: z.string().min(1, t('errors.timezoneRequired')),
  })
}

type OnboardingValues = z.infer<ReturnType<typeof onboardingSchema>>

/**
 * Second half of sign-up: Clerk has verified who the person is, this creates the
 * company they operate. Reached after `<SignUp />`, and also whenever
 * `/auth/me` reports `user_not_onboarded` — an account interrupted here would
 * otherwise have no way back in.
 */
export function OnboardingPage() {
  const { t, i18n } = useTranslation('auth')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const me = useMe()

  const [formError, setFormError] = useState<string | null>(null)
  // Set once the company exists, so the guard below does not send the account to the dashboard
  // between the refreshed account arriving and the move on to the plans.
  const [created, setCreated] = useState(false)
  // Beside the form rather than in it: the parts are never typed, only replaced with the address.
  const [pin, setPin] = useState<AddressPin>({})
  // Once chosen by hand the country stops following the address: a company can be based in
  // one country and operate in another.
  const countryChosen = useRef(false)
  // Likewise the zone: until picked by hand it follows the country, which follows the address.
  const timezoneChosen = useRef(false)

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
    formState: { errors, isSubmitting },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ownerFullName: '',
      tenantName: '',
      website: '',
      address: '',
      country: '',
      fleetSize: undefined,
      timezone: browserTimezone(),
    },
  })

  const country = useWatch({ control, name: 'country' })
  const followCountry = (code: string) => {
    if (!timezoneChosen.current) setValue('timezone', timezoneForCountry(getValues('timezone'), code))
  }

  // Google sign-ups hand Clerk a name, so they are not asked for it twice; email sign-ups have none.
  const clerkName = user?.fullName
  useEffect(() => {
    if (clerkName && !getValues('ownerFullName')) setValue('ownerFullName', clerkName)
  }, [clerkName, getValues, setValue])

  const onSubmit = async (values: OnboardingValues) => {
    setFormError(null)
    try {
      await registerWithFreeSubdomain({
        tenantName: values.tenantName,
        timezone: values.timezone,
        ownerFullName: values.ownerFullName,
        country: values.country,
        fleetSize: values.fleetSize,
        website: values.website || undefined,
        companyAddress: { address: values.address, ...pin },
      })
      setCreated(true)
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY })
      navigate(ONBOARDING_PATHS.plan, { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'subdomain_taken') {
        setFormError(t('errors.subdomainTaken'))
        return
      }
      // A 422 names the fields it rejected. Showing only "Request validation failed" left the
      // form with nothing to fix, so each message goes under the field it belongs to.
      const fieldErrors = error instanceof ApiError ? (error.fieldErrors ?? []) : []
      // The request's keys are the form's names, so the schema says which ones a field shows.
      const placed = fieldErrors.filter(({ field }) => field in schema.shape)
      for (const { field, message } of placed) {
        setError(field as keyof OnboardingValues, { message }, { shouldFocus: true })
      }
      if (placed.length) return
      setFormError(error instanceof Error ? error.message : t('errors.unknown'))
    }
  }

  if (!isLoaded) return <LoadingState />
  if (!isSignedIn) return <Navigate to="/login" replace />
  // Already has a company — nothing to onboard.
  if (me.data && !created) return <Navigate to="/dashboard" replace />

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
          {(fieldProps) => <Input autoComplete="organization" {...register('tenantName')} {...fieldProps} />}
        </FormField>

        <FormField label={t('onboarding.website')} error={errors.website?.message}>
          {(fieldProps) => (
            <Input
              inputMode="url"
              placeholder={t('onboarding.websitePlaceholder')}
              {...register('website')}
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

        <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
          {t('onboarding.submit')}
        </Button>
      </form>
    </div>
  )
}
