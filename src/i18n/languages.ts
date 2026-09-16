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

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((l) => l.code === value)
}
