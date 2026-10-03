import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useOrganizationStore } from '@/state/organization.store'
import { INTL_LOCALES, isLanguage, type Language } from './languages'
import i18n from './index'

export function currentLanguage(): Language {
  const resolved = i18n.resolvedLanguage ?? i18n.language
  return isLanguage(resolved) ? resolved : 'en'
}

function intlLocale(language: Language): string {
  return INTL_LOCALES[language]
}

/** The company's currency, for amounts that carry none; payments carry their own. */
function companyCurrency(): string {
  return useOrganizationStore.getState().membership?.currency ?? 'USD'
}

export function formatCurrencyIn(language: Language, amount: number, currency = companyCurrency()): string {
  return new Intl.NumberFormat(intlLocale(language), {
    style: 'currency',
    currency,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount)
}

/** "$" for USD, "€" for EUR: the narrow symbol, for an amount field's prefix. */
export function currencySymbolIn(language: Language, currency = companyCurrency()): string {
  const parts = new Intl.NumberFormat(intlLocale(language), {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).formatToParts(0)
  return parts.find((part) => part.type === 'currency')?.value ?? currency
}

export function formatNumberIn(language: Language, value: number): string {
  return new Intl.NumberFormat(intlLocale(language)).format(value)
}

export function formatDateIn(language: Language, date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(intlLocale(language), options).format(date)
}

/**
 * Locale-aware formatters bound to the active language. Returned from a hook (rather than
 * imported as plain functions) so components re-render with new output the moment the
 * language changes — the same way `t` does.
 */
export function useFormatters() {
  const { i18n: instance } = useTranslation()
  const language: Language = isLanguage(instance.resolvedLanguage) ? instance.resolvedLanguage : 'en'
  // Subscribed rather than read at call time, so a currency change in settings re-renders prices.
  const currencyCode = useOrganizationStore((state) => state.membership?.currency ?? 'USD')

  return useMemo(
    () => ({
      language,
      locale: intlLocale(language),
      currencyCode,
      currency: (amount: number, currency = currencyCode) => formatCurrencyIn(language, amount, currency),
      currencySymbol: (currency = currencyCode) => currencySymbolIn(language, currency),
      number: (value: number) => formatNumberIn(language, value),
      percent: (value: number) => `${formatNumberIn(language, value)}%`,
      date: (date: Date | string, options: Intl.DateTimeFormatOptions) =>
        formatDateIn(language, typeof date === 'string' ? new Date(date) : date, options),
      /** "Sep 14" / "14 sept." — the compact form used in availability and timeline strips. */
      shortDate: (date: Date | string) =>
        formatDateIn(language, typeof date === 'string' ? new Date(date) : date, { month: 'short', day: 'numeric' }),
      /** "Sep 2024" / "sept. 2024" — used for "in fleet since". */
      monthYear: (date: Date | string) =>
        formatDateIn(language, typeof date === 'string' ? new Date(date) : date, { month: 'short', year: 'numeric' }),
    }),
    [language, currencyCode],
  )
}

/** Non-React callers (query mutations, api error mapping) that still need locale-aware money. */
export function formatCurrency(amount: number): string {
  return formatCurrencyIn(currentLanguage(), amount)
}
