import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/ui/input'
import { useCompanySection } from '../hooks/use-company-section'
import { companySchema } from '../schema/company.schema'
import type { Company } from '../types/company.types'
import { SettingsCard } from './SettingsCard'

export function ContactCard({ company }: { company: Company }) {
  const { t } = useTranslation('settings')
  const { t: tValidation } = useTranslation('validation')
  const schema = useMemo(
    () => companySchema(tValidation).pick({ website: true, contactEmail: true, contactPhone: true, address: true }),
    [tValidation],
  )
  const { form, submit, discard, saving } = useCompanySection(company, schema)
  const { register, formState: { errors, isDirty } } = form

  return (
    <SettingsCard
      title={t('company.contact.title')}
      description={t('company.contact.description')}
      onSubmit={submit}
      onDiscard={discard}
      dirty={isDirty}
      saving={saving}
    >
      <FormField label={t('company.contact.email')} error={errors.contactEmail?.message}>
        {(fieldProps) => (
          <Input
            type="email"
            autoComplete="email"
            placeholder={t('company.contact.emailPlaceholder')}
            {...register('contactEmail')}
            {...fieldProps}
          />
        )}
      </FormField>

      <FormField label={t('company.contact.phone')} error={errors.contactPhone?.message}>
        {(fieldProps) => (
          <Input
            type="tel"
            autoComplete="tel"
            placeholder={t('company.contact.phonePlaceholder')}
            {...register('contactPhone')}
            {...fieldProps}
          />
        )}
      </FormField>

      <FormField label={t('company.contact.website')} error={errors.website?.message}>
        {(fieldProps) => (
          <Input
            inputMode="url"
            placeholder={t('company.contact.websitePlaceholder')}
            {...register('website')}
            {...fieldProps}
          />
        )}
      </FormField>

      <FormField label={t('company.contact.address')} error={errors.address?.message}>
        {(fieldProps) => (
          <Input
            autoComplete="street-address"
            placeholder={t('company.contact.addressPlaceholder')}
            {...register('address')}
            {...fieldProps}
          />
        )}
      </FormField>
    </SettingsCard>
  )
}
