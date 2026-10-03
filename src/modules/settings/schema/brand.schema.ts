import type { TFunction } from 'i18next'
import { z } from 'zod'
import { HEADLINE_MAX } from '../constants/brand.constants'
import { isHexColor } from '../utils/brand.utils'

export function brandSchema(t: TFunction<'validation'>) {
  const color = z.string().trim().refine(isHexColor, t('brand.colorInvalid'))
  return z.object({
    primaryColor: color,
    backgroundColor: color,
    textColor: color,
    headline: z.string().trim().max(HEADLINE_MAX, t('brand.headlineTooLong')),
  })
}
