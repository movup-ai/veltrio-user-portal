import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, FileSearch } from 'lucide-react'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { SettingsCard } from '@/modules/settings/components/SettingsCard'
import { resetKeepingEdits } from '@/modules/settings/utils/form.utils'
import { normalizeApiError } from '@/services/api/errors'
import {
  TEMPLATE_BODY_MAX,
  TEMPLATE_NAME_MAX,
  TEMPLATE_NAME_TAKEN,
} from '../constants/agreement-template.constants'
import { useAgreementTemplatePreview, useSaveAgreementTemplate } from '../hooks/use-agreement-templates'
import { agreementTemplateSchema } from '../schema/agreement-template.schema'
import type { AgreementTemplate, AgreementTemplateValues } from '../types/agreement-template.types'
import { AGREEMENTS_PATH } from '../utils/agreement-template.utils'

const BLANK: AgreementTemplateValues = { name: '', body: '' }

/** One template's name and terms. Without a `template` it creates one, then returns to the list. */
export function AgreementTemplateEditor({ template }: { template?: AgreementTemplate }) {
  const { t } = useTranslation('contracts')
  const { t: tValidation } = useTranslation('validation')
  const navigate = useNavigate()
  const schema = useMemo(() => agreementTemplateSchema(tValidation), [tValidation])
  const save = useSaveAgreementTemplate(template?.id)
  const preview = useAgreementTemplatePreview()

  const form = useForm<AgreementTemplateValues>({
    resolver: zodResolver(schema),
    defaultValues: template ? { name: template.name, body: template.body } : BLANK,
  })
  const { register, formState: { errors, isDirty } } = form

  const submit = form.handleSubmit(async (values) => {
    const atSubmit = form.getValues()
    try {
      const saved = await save.mutateAsync(values)
      if (!template) return navigate(AGREEMENTS_PATH)
      resetKeepingEdits(form, atSubmit, { name: saved.name, body: saved.body })
    } catch (error) {
      const apiError = normalizeApiError(error)
      if (apiError.code === TEMPLATE_NAME_TAKEN) {
        return form.setError('name', { message: tValidation('agreements.nameTaken') }, { shouldFocus: true })
      }
      toast({ title: t('agreements.toast.saveFailed'), description: apiError.message, variant: 'error' })
    }
  })

  // Previews what is typed, so new wording can be read as a renter will before it is saved.
  const openPreview = () => {
    const body = form.getValues('body')
    if (!body.trim()) return void form.trigger('body', { shouldFocus: true })
    preview.open(body)
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5">
        <Link to={AGREEMENTS_PATH}>
          <ArrowLeft className="size-4" aria-hidden />
          {t('agreements.editor.back')}
        </Link>
      </Button>

      <SettingsCard
        title={template ? t('agreements.editor.editTitle') : t('agreements.editor.newTitle')}
        description={t('agreements.editor.description')}
        onSubmit={submit}
        onDiscard={() => form.reset()}
        dirty={isDirty}
        saving={save.isPending}
        columns={1}
        submitLabel={template ? undefined : t('agreements.editor.create')}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            loading={preview.isPending}
            onClick={openPreview}
          >
            <FileSearch className="size-4" aria-hidden />
            {t('agreements.editor.preview')}
          </Button>
        }
      >
        <FormField
          label={t('agreements.editor.name')}
          description={t('agreements.editor.nameHelp')}
          error={errors.name?.message}
          required
        >
          {(fieldProps) => (
            <Input
              maxLength={TEMPLATE_NAME_MAX}
              placeholder={t('agreements.editor.namePlaceholder')}
              autoComplete="off"
              {...register('name')}
              {...fieldProps}
            />
          )}
        </FormField>

        <FormField
          label={t('agreements.editor.body')}
          description={t('agreements.editor.bodyHelp')}
          error={errors.body?.message}
          required
        >
          {(fieldProps) => (
            <Textarea
              rows={24}
              maxLength={TEMPLATE_BODY_MAX}
              className="leading-relaxed"
              {...register('body')}
              {...fieldProps}
            />
          )}
        </FormField>
      </SettingsCard>
    </>
  )
}
