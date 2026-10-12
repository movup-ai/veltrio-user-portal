import { enUS, es, type Locale } from 'date-fns/locale'

export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'es', label: 'Español', short: 'ES' },
] as const

export type Language = (typeof LANGUAGES)[number]['code']

export const DEFAULT_LANGUAGE: Language = 'en'

export const LANGUAGE_STORAGE_KEY = 'veltrio.language'

/**
 * BCP-47 tags handed to Intl. Spanish maps to es-US rather than es-ES so money keeps the
 * US conventions this product is built around ($1,234.50, not 1.234,50 $) while dates and
 * month names still localize.
 */
export const INTL_LOCALES: Record<Language, string> = {
  en: 'en-US',
  es: 'es-US',
}

/** For the pickers and grids that lay weeks out, which Intl cannot do on its own. */
export const DATE_FNS_LOCALES: Record<Language, Locale> = { en: enUS, es }

/** Sunday or Monday: the same day the date picker starts its weeks on. */
export function weekStartsOn(language: Language): 0 | 1 {
  return DATE_FNS_LOCALES[language].options?.weekStartsOn === 1 ? 1 : 0
}

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((l) => l.code === value)
}
