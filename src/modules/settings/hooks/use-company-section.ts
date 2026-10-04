import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type DefaultValues, type FieldValues, type Path, type Resolver } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'
import { toCompanyValues } from '../api/settings.mapper'
import type { Company, CompanyValues } from '../types/company.types'
import { changedValues } from '../utils/company.utils'
import { resetKeepingEdits } from '../utils/form.utils'
import { useUpdateCompany } from './use-company'

function pick<V>(company: Company, keys: string[]): V {
  const values = toCompanyValues(company) as Record<string, unknown>
  return Object.fromEntries(keys.map((key) => [key, values[key]])) as V
}

/**
 * One settings card's form over a slice of the company. Each card saves on its own, so a save
 * sends only that card's changed fields and leaves edits pending in the others untouched.
 */
export function useCompanySection<S extends z.ZodObject>(company: Company, schema: S) {
  type Values = z.infer<S> & FieldValues
  const { t } = useTranslation('settings')
  const update = useUpdateCompany()
  const keys = Object.keys(schema.shape)

  const form = useForm<Values>({
    resolver: zodResolver(schema) as unknown as Resolver<Values>,
    defaultValues: pick<DefaultValues<Values>>(company, keys),
  })

  const submit = form.handleSubmit(async (values) => {
    const atSubmit = form.getValues()
    const initial = form.formState.defaultValues as unknown as CompanyValues
    const patch = changedValues(values as unknown as CompanyValues, initial)
    if (Object.keys(patch).length === 0) return form.reset(values)
    try {
      const saved = await update.mutateAsync(patch)
      resetKeepingEdits(form, atSubmit, pick<Values>(saved, keys))
    } catch (error) {
      const apiError = normalizeApiError(error)
      const placed = (apiError.fieldErrors ?? []).filter(({ field }) => keys.includes(field))
      for (const { field, message } of placed) {
        form.setError(field as Path<Values>, { message }, { shouldFocus: true })
      }
      if (!placed.length) {
        toast({ title: t('company.toast.saveFailed'), description: apiError.message, variant: 'error' })
      }
    }
  })

  return { form, submit, discard: () => form.reset(), saving: update.isPending }
}
