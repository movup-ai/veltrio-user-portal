import { ExternalLink } from 'lucide-react'
import { useMemo } from 'react'
import { Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { siteUrl as companySiteUrl } from '@/modules/vehicles/utils/public-links'
import { FLEET_SIZES } from '@/services/auth/auth.api'
import { useCompanySection } from '../hooks/use-company-section'
import { DESCRIPTION_MAX } from '../constants/company.constants'
import { companySchema } from '../schema/company.schema'
import type { Company } from '../types/company.types'
import { SettingsCard } from './SettingsCard'

export function CompanyProfileCard({ company }: { company: Company }) {
  const { t } = useTranslation('settings')
  const { t: tAuth } = useTranslation('auth')
  const { t: tValidation } = useTranslation('validation')
  const schema = useMemo(
    () =>
      companySchema(tValidation).pick({ name: true, legalName: true, taxId: true, fleetSize: true, description: true }),
    [tValidation],
  )
  const { form, submit, discard, saving } = useCompanySection(company, schema)
  const { register, control, formState: { errors, isDirty } } = form
  const siteUrl = companySiteUrl(company.subdomain)

  return (
    <SettingsCard
      title={t('company.profile.title')}
      description={t('company.profile.description')}
      onSubmit={submit}
      onDiscard={discard}
      dirty={isDirty}
      saving={saving}
    >
      <FormField label={t('company.profile.name')} error={errors.name?.message} required>
        {(fieldProps) => <Input autoComplete="organization" {...register('name')} {...fieldProps} />}
      </FormField>

      <FormField
        label={t('company.profile.legalName')}
        description={t('company.profile.legalNameHelp')}
        error={errors.legalName?.message}
      >
        {(fieldProps) => (
          <Input
            placeholder={t('company.profile.legalNamePlaceholder')}
            {...register('legalName')}
            {...fieldProps}
          />
        )}
      </FormField>

      <FormField label={t('company.profile.taxId')} description={t('company.profile.taxIdHelp')} error={errors.taxId?.message}>
        {(fieldProps) => <Input autoComplete="off" {...register('taxId')} {...fieldProps} />}
      </FormField>

      <FormField label={t('company.profile.fleetSize')} description={t('company.profile.fleetSizeHelp')} required>
        {(fieldProps) => (
          <Controller
            control={control}
            name="fleetSize"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger {...fieldProps}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FLEET_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {tAuth(`onboarding.fleetSizes.${size}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
      </FormField>

      <FormField
        label={t('company.profile.subdomain')}
        description={t('company.profile.subdomainHelp')}
        className="sm:col-span-2"
      >
        {(fieldProps) => (
          <div className="flex gap-2">
            <Input readOnly value={new URL(siteUrl).host} className="bg-muted" {...fieldProps} />
            <Button asChild variant="outline" size="icon">
              <a href={siteUrl} target="_blank" rel="noreferrer" aria-label={t('company.profile.openSite')}>
                <ExternalLink />
              </a>
            </Button>
          </div>
        )}
      </FormField>

      <FormField
        label={t('company.profile.about')}
        description={t('company.profile.aboutHelp', { max: DESCRIPTION_MAX })}
        error={errors.description?.message}
        className="sm:col-span-2"
      >
        {(fieldProps) => (
          <Textarea
            rows={3}
            maxLength={DESCRIPTION_MAX}
            placeholder={t('company.profile.aboutPlaceholder')}
            {...register('description')}
            {...fieldProps}
          />
        )}
      </FormField>
    </SettingsCard>
  )
}
