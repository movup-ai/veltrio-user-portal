import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/ui/input'
import { SOCIAL_DOMAINS, SOCIAL_HANDLE_PREFIX } from '../constants/company.constants'
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
        instagramHandle: true,
        facebookHandle: true,
        xHandle: true,
        tiktokHandle: true,
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
            <div className="flex">
              <span className="border-input bg-muted text-fg-3 flex h-9 items-center rounded-l-md border border-r-0 px-3 text-[13px] whitespace-nowrap">
                {SOCIAL_DOMAINS[field][0]}/{SOCIAL_HANDLE_PREFIX[field]}
              </span>
              <Input
                autoComplete="off"
                spellCheck={false}
                placeholder={t('company.social.placeholder')}
                className="rounded-l-none"
                {...register(field)}
                {...fieldProps}
              />
            </div>
          )}
        </FormField>
      ))}
    </SettingsCard>
  )
}
