import { useMemo } from 'react'
import { Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormField } from '@/components/forms/FormField'
import { Combobox } from '@/components/ui/combobox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { countryOptions } from '@/utils/countries'
import { TIMEZONES } from '@/utils/dates'
import { SUPPORTED_CURRENCIES } from '../constants/company.constants'
import { useCompanySection } from '../hooks/use-company-section'
import { companySchema } from '../schema/company.schema'
import type { Company } from '../types/company.types'
import { currencyLabel } from '../utils/company.utils'
import { SettingsCard } from './SettingsCard'

export function LocalizationCard({ company }: { company: Company }) {
  const { t, i18n } = useTranslation('settings')
  const { t: tValidation } = useTranslation('validation')
  const language = i18n.resolvedLanguage ?? 'en'
  const countries = useMemo(() => countryOptions(language), [language])
  const countryNames = useMemo(() => countries.map((c) => c.name), [countries])
  const schema = useMemo(
    () => companySchema(tValidation).pick({ country: true, timezone: true, currency: true }),
    [tValidation],
  )
  const { form, submit, discard, saving } = useCompanySection(company, schema)
  const { control, formState: { errors, isDirty } } = form

  return (
    <SettingsCard
      title={t('company.localization.title')}
      description={t('company.localization.description')}
      onSubmit={submit}
      onDiscard={discard}
      dirty={isDirty}
      saving={saving}
    >
      <FormField label={t('company.localization.country')} error={errors.country?.message} required>
        {(fieldProps) => (
          <Controller
            control={control}
            name="country"
            render={({ field }) => (
              <Combobox
                options={countryNames}
                // The form holds the ISO code; the combobox shows the localized name.
                value={countries.find((c) => c.code === field.value)?.name ?? ''}
                onChange={(name) => field.onChange(countries.find((c) => c.name === name)?.code ?? '')}
                {...fieldProps}
              />
            )}
          />
        )}
      </FormField>

      <FormField label={t('company.localization.timezone')} error={errors.timezone?.message} required>
        {(fieldProps) => (
          <Controller
            control={control}
            name="timezone"
            render={({ field }) => (
              <Combobox options={TIMEZONES} value={field.value} onChange={field.onChange} {...fieldProps} />
            )}
          />
        )}
      </FormField>

      <FormField
        label={t('company.localization.currency')}
        description={company.currencyLocked ? t('company.localization.currencyLocked') : undefined}
        error={errors.currency?.message}
        required
      >
        {(fieldProps) => (
          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={company.currencyLocked}>
                <SelectTrigger {...fieldProps}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {currencyLabel(code, language)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
      </FormField>
    </SettingsCard>
  )
}
