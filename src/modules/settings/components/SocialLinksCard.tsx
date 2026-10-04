import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/ui/input'
import { SOCIAL_DOMAINS } from '../constants/company.constants'
import { useCompanySection } from '../hooks/use-company-section'
import { companySchema } from '../schema/company.schema'
import { SOCIAL_FIELDS, type Company } from '../types/company.types'
import { SettingsCard } from './SettingsCard'

export function SocialLinksCard({ company }: { company: Company }) {
  const { t } = useTranslation('settings')
  const { t: tValidation } = useTranslation('validation')
  const schema = useMemo(
    () =>
      companySchema(tValidation).pick({
        instagramUrl: true,
        facebookUrl: true,
        xUrl: true,
        tiktokUrl: true,
      }),
    [tValidation],
  )
  const { form, submit, discard, saving } = useCompanySection(company, schema)
  const { register, formState: { errors, isDirty } } = form

  return (
    <SettingsCard
      title={t('company.social.title')}
      description={t('company.social.description')}
      onSubmit={submit}
      onDiscard={discard}
      dirty={isDirty}
      saving={saving}
    >
      {SOCIAL_FIELDS.map((field) => (
        <FormField key={field} label={t(`company.social.${field}`)} error={errors[field]?.message}>
          {(fieldProps) => (
            <Input
              inputMode="url"
              placeholder={t('company.social.placeholder', { domain: SOCIAL_DOMAINS[field][0] })}
              {...register(field)}
              {...fieldProps}
            />
          )}
        </FormField>
      ))}
    </SettingsCard>
  )
}
