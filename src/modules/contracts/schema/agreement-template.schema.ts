import type { TFunction } from 'i18next'
import { z } from 'zod'
import { TEMPLATE_BODY_MAX, TEMPLATE_NAME_MAX } from '../constants/agreement-template.constants'

export function agreementTemplateSchema(t: TFunction<'validation'>) {
  return z.object({
    name: z.string().trim().min(1, t('agreements.nameRequired')).max(TEMPLATE_NAME_MAX, t('agreements.nameTooLong')),
    body: z.string().trim().min(1, t('agreements.bodyRequired')).max(TEMPLATE_BODY_MAX, t('agreements.bodyTooLong')),
  })
}
