import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from './index'

/**
 * Domain values (statuses, vehicle types, fuel types, …) stay in canonical English
 * everywhere they are stored, filtered or sent to the API — only their *display* is
 * translated, via `domain.json` where the key is the canonical value.
 *
 * Lookups are deliberately loose (`string` in, `defaultValue` out) because several of these
 * values arrive as plain strings from mock/table data. An unknown value renders as-is rather
 * than leaking a raw key into the UI.
 */
type DomainGroup =
  | 'status'
  | 'vehicleType'
  | 'transmission'
  | 'fuelType'
  | 'serviceType'
  | 'billingBasis'
  | 'billingBasisHint'
  | 'billingBasisSuffix'
  | 'billingBasisPer'
  | 'billingBasisUnit'

function lookup(group: DomainGroup, value: string): string {
  return i18n.t(`domain:${group}.${value}` as never, { defaultValue: value })
}

export function translateStatus(status: string): string {
  return lookup('status', status)
}

export function translateDomain(group: DomainGroup, value: string): string {
  return lookup(group, value)
}

/** Pluralized duration unit — "3 days" / "3 días", "1 day" / "1 día". */
export function translateDurationUnit(unit: string, count: number): string {
  return i18n.t(`domain:durationUnit.${unit}` as never, { count, defaultValue: unit })
}

/**
 * Re-created whenever the language changes so components that call these re-render.
 * The underlying functions read the live i18n instance, so the identity change is what
 * matters here, not the closure.
 */
export function useDomainLabels() {
  const { i18n: instance } = useTranslation('domain')
  const language = instance.resolvedLanguage

  return useMemo(
    () => ({
      status: translateStatus,
      label: translateDomain,
      durationUnit: translateDurationUnit,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- language is the intended trigger
    [language],
  )
}
