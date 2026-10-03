import { zodResolver } from '@hookform/resolvers/zod'
import { Lock } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@/components/feedback/Can'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { FormField } from '@/components/forms/FormField'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useVehicles } from '@/modules/vehicles/hooks/use-vehicles'
import { hasAnyPermission } from '@/utils/permissions'
import { toBrandValues } from '../api/settings.mapper'
import { HEADLINE_MAX } from '../constants/brand.constants'
import { useBrand, useUpdateBrand } from '../hooks/use-brand'
import { useCompany } from '../hooks/use-company'
import { brandSchema } from '../schema/brand.schema'
import type { Brand, BrandAsset, BrandValues } from '../types/brand.types'
import type { Company } from '../types/company.types'
import { isHexColor } from '../utils/brand.utils'
import { changedValues } from '../utils/company.utils'
import { BrandImageField } from './BrandImageField'
import { BrandPreview } from './BrandPreview'
import { ColorField } from './ColorField'
import { SettingsCard } from './SettingsCard'

const PREVIEW_VEHICLES = { page: 1, pageSize: 3 }

/** The Brand tab. Owner-only on the API, like the company it decorates. */
export function BrandSettings() {
  const { t } = useTranslation('settings')
  const canManage = hasAnyPermission(usePermissions(), ['settings.manage'])
  const brand = useBrand(canManage)
  const company = useCompany(canManage)

  if (!canManage) {
    return <EmptyState icon={Lock} title={t('company.ownerOnly.title')} description={t('company.ownerOnly.description')} />
  }
  if (brand.isLoading || company.isLoading) return <LoadingState />
  if (!brand.data || !company.data) {
    return (
      <ErrorState
        onRetry={() => {
          void brand.refetch()
          void company.refetch()
        }}
      />
    )
  }
  return <BrandEditor brand={brand.data} company={company.data} />
}

function BrandEditor({ brand, company }: { brand: Brand; company: Company }) {
  const { t } = useTranslation('settings')
  const { t: tValidation } = useTranslation('validation')
  const schema = useMemo(() => brandSchema(tValidation), [tValidation])
  const update = useUpdateBrand()
  const vehicles = useVehicles(PREVIEW_VEHICLES).data?.items ?? []
  const [pending, setPending] = useState<Partial<Record<BrandAsset, string>>>({})

  const form = useForm<BrandValues>({ resolver: zodResolver(schema), defaultValues: toBrandValues(brand) })
  const { control, register, formState: { errors, isDirty } } = form
  const live = useWatch({ control }) as BrandValues
  // A half-typed code previews the saved colour rather than nothing.
  const color = (key: 'primaryColor' | 'backgroundColor' | 'textColor') => (isHexColor(live[key]) ? live[key] : brand[key])
  const primary = color('primaryColor')
  const background = color('backgroundColor')
  const text = color('textColor')

  const submit = form.handleSubmit(async (values) => {
    const patch = changedValues(values, form.formState.defaultValues as BrandValues)
    if (Object.keys(patch).length === 0) return form.reset(values)
    const saved = await update.mutateAsync(patch).catch(() => undefined)
    if (saved) form.reset(toBrandValues(saved))
  })

  const colorField = (key: 'primaryColor' | 'backgroundColor' | 'textColor', help?: string) => (
    <FormField label={t(`brand.style.${key}`)} description={help} error={errors[key]?.message}>
      {(fieldProps) => (
        <Controller
          control={control}
          name={key}
          render={({ field }) => (
            <ColorField
              name={t(`brand.style.${key}`)}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              {...fieldProps}
            />
          )}
        />
      )}
    </FormField>
  )

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <Card as="section" className="flex flex-col gap-5 p-[18px]">
          <PanelHeading title={t('brand.images.title')} description={t('brand.images.description')} />
          <BrandImageField asset="logo" url={brand.logoUrl} onPreview={(url) => setPending((p) => ({ ...p, logo: url }))} />
          <BrandImageField asset="banner" url={brand.bannerUrl} onPreview={(url) => setPending((p) => ({ ...p, banner: url }))} />
        </Card>

        <SettingsCard
          title={t('brand.style.title')}
          description={t('brand.style.description')}
          onSubmit={submit}
          onDiscard={() => form.reset()}
          dirty={isDirty}
          saving={update.isPending}
          columns={1}
        >
          {colorField('primaryColor', t('brand.style.primaryColorHelp'))}
          {colorField('backgroundColor')}
          {colorField('textColor')}
          <FormField label={t('brand.style.headline')} description={t('brand.style.headlineHelp')} error={errors.headline?.message}>
            {(fieldProps) => (
              <Input maxLength={HEADLINE_MAX} placeholder={t('brand.style.headlinePlaceholder')} {...register('headline')} {...fieldProps} />
            )}
          </FormField>
        </SettingsCard>
      </div>

      <div className="flex flex-col gap-2 lg:sticky lg:top-4">
        <BrandPreview
          primaryColor={primary}
          backgroundColor={background}
          textColor={text}
          headline={live.headline?.trim() || undefined}
          logoUrl={pending.logo ?? brand.logoUrl}
          bannerUrl={pending.banner ?? brand.bannerUrl}
          company={company}
          vehicles={vehicles}
        />
        <p className="text-description px-1">{t('brand.preview.note')}</p>
      </div>
    </div>
  )
}
