import { useAuth } from '@clerk/clerk-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import type { TFunction } from 'i18next'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { FormField } from '@/components/forms/FormField'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { authApi, FLEET_SIZES } from '@/services/auth/auth.api'
import { ME_QUERY_KEY, useMe } from '@/services/auth/use-me'
import { ApiError } from '@/types/api'
import { countryOptions, isCountryCode } from '@/utils/countries'
import { isReservedSubdomain, isValidSubdomain, isValidWebsite, slugify } from '@/utils/slug'

const TIMEZONES = Intl.supportedValuesOf('timeZone')
const BROWSER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

function onboardingSchema(t: TFunction<'auth'>) {
  return z.object({
    ownerFullName: z.string().trim().min(1, t('errors.fullNameRequired')),
    tenantName: z.string().trim().min(1, t('errors.companyNameRequired')),
    subdomain: z
      .string()
      .trim()
      .min(1, t('errors.subdomainRequired'))
      .refine(isValidSubdomain, t('errors.subdomainInvalid'))
      .refine((value) => !isReservedSubdomain(value), t('errors.subdomainReserved')),
    website: z.string().trim().refine(isValidWebsite, t('errors.websiteInvalid')),
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
  const me = useMe()

  const [formError, setFormError] = useState<string | null>(null)
  // Once the subdomain is edited by hand it stops tracking the company name.
  // Clearing the field opts back in, so a mistyped edit is not a dead end.
  const [subdomainEdited, setSubdomainEdited] = useState(false)

  const countries = useMemo(() => countryOptions(i18n.resolvedLanguage ?? 'en'), [i18n.resolvedLanguage])
  const countryNames = useMemo(() => countries.map((c) => c.name), [countries])
  const schema = useMemo(() => onboardingSchema(t), [t])

  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ownerFullName: '',
      tenantName: '',
      subdomain: '',
      website: '',
      country: '',
      fleetSize: undefined,
      timezone: BROWSER_TIMEZONE,
    },
  })

  const tenantName = useWatch({ control, name: 'tenantName' })

  useEffect(() => {
    if (subdomainEdited) return
    setValue('subdomain', slugify(tenantName), { shouldValidate: isSubmitted })
  }, [tenantName, subdomainEdited, setValue, isSubmitted])

  const onSubmit = async (values: OnboardingValues) => {
    setFormError(null)
    try {
      await authApi.registerTenant({
        tenantName: values.tenantName,
        subdomain: values.subdomain,
        timezone: values.timezone,
        ownerFullName: values.ownerFullName,
        country: values.country,
        fleetSize: values.fleetSize,
        website: values.website || undefined,
      })
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY })
      navigate('/dashboard', { replace: true })
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
  if (me.data) return <Navigate to="/dashboard" replace />

  return (
    <div className="w-full max-w-lg rounded-lg border border-border bg-card p-8 shadow-sm">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="flex flex-col gap-1">
          <h1 className="text-section-title">{t('onboarding.title')}</h1>
          <p className="text-description">{t('onboarding.subtitle')}</p>
        </div>

        <FormField label={t('onboarding.fullName')} error={errors.ownerFullName?.message} required>
          {(fieldProps) => <Input autoComplete="name" {...register('ownerFullName')} {...fieldProps} />}
        </FormField>

        <FormField label={t('onboarding.companyName')} error={errors.tenantName?.message} required>
          {(fieldProps) => (
            <Input autoComplete="organization" {...register('tenantName')} {...fieldProps} />
          )}
        </FormField>

        <FormField
          label={t('onboarding.subdomain')}
          error={errors.subdomain?.message}
          description={t('onboarding.subdomainHelp')}
          required
        >
          {(fieldProps) => (
            <Input
              autoComplete="off"
              spellCheck={false}
              {...register('subdomain', {
                onChange: (event) => setSubdomainEdited(event.target.value.trim() !== ''),
              })}
              {...fieldProps}
            />
          )}
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
                  onChange={(name) =>
                    field.onChange(countries.find((c) => c.name === name)?.code ?? '')
                  }
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

        <FormField label={t('onboarding.timezone')} error={errors.timezone?.message} required>
          {(fieldProps) => (
            <Controller
              control={control}
              name="timezone"
              render={({ field }) => (
                <Combobox
                  options={TIMEZONES}
                  value={field.value}
                  onChange={field.onChange}
                  {...fieldProps}
                />
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
