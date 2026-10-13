import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useOrganizationStore } from '@/state/organization.store'
import { awayFromCompanyTime, companyTimeZone, zoneName } from '@/utils/company-time'
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

/** An ISO timestamp that names its offset: a real instant, as the API sends them. */
const INSTANT = /T.*(Z|[+-]\d{2}:?\d{2})$/

/**
 * An instant from the API is shown on the company's clock. A Date, or a string with no offset,
 * is a day or time someone picked on screen, and is shown as it was picked.
 */
export function formatMomentIn(
  language: Language,
  date: Date | string,
  options: Intl.DateTimeFormatOptions,
  zone = companyTimeZone(),
): string {
  if (typeof date !== 'string') return formatDateIn(language, date, options)
  const timeZone = INSTANT.test(date) ? zone : undefined
  return formatDateIn(language, new Date(date), { ...options, timeZone })
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
  // Subscribed for the same reason: a new company zone re-renders every time on screen.
  const timeZone = useOrganizationStore((state) => state.membership?.timezone)

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
        formatMomentIn(language, date, options, timeZone),
      /** "Oct 2, 11:21 PM" — a moment on the 12-hour clock, which is how the counter reads times. */
      dateTime: (date: Date | string) => {
        const shown = formatMomentIn(
          language,
          date,
          {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          },
          timeZone,
        )
        if (typeof date !== 'string' || !INSTANT.test(date)) return shown
        // Named only for someone whose own clock differs at that moment, not merely today: two
        // zones can agree now and be an hour apart by the booking.
        return awayFromCompanyTime(Date.parse(date), timeZone)
          ? `${shown} ${zoneName(date, timeZone)}`
          : shown
      },
      /** "Sep 14" / "14 sept." — the compact form used in availability and timeline strips. */
      shortDate: (date: Date | string) =>
        formatMomentIn(language, date, { month: 'short', day: 'numeric' }, timeZone),
      /** "Sep 2024" / "sept. 2024" — used for "in fleet since". */
      monthYear: (date: Date | string) =>
        formatMomentIn(language, date, { month: 'short', year: 'numeric' }, timeZone),
    }),
    [language, currencyCode, timeZone],
  )
}

/**
 * One formatter kept across renders, for a grid that formats hundreds of dates at once: building
 * an `Intl.DateTimeFormat` per call is the slow part. `options` must be a constant, not a literal.
 */
export function useDateFormat(options: Intl.DateTimeFormatOptions): (date: Date) => string {
  const { locale } = useFormatters()

  return useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, options)
    return (date: Date) => formatter.format(date)
  }, [locale, options])
}

/** Non-React callers (query mutations, api error mapping) that still need locale-aware money. */
export function formatCurrency(amount: number): string {
  return formatCurrencyIn(currentLanguage(), amount)
}
