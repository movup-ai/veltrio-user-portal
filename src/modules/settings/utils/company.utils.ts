import { SOCIAL_DOMAINS } from '../constants/company.constants'
import type { SocialField } from '../types/company.types'

/**
 * The fields whose trimmed value differs from what was loaded. Sending only these keeps a
 * section's save from overwriting what another tab or person changed in a different one.
 */
export function changedValues<V extends { [K in keyof V]: string }>(values: V, initial: V): Partial<V> {
  const keys = Object.keys(values) as (keyof V)[]
  return Object.fromEntries(
    keys.filter((key) => values[key].trim() !== initial[key].trim()).map((key) => [key, values[key]]),
  ) as Partial<V>
}

/** Blank is fine; otherwise a profile link on the field's own network, as the API requires. */
export function isSocialUrl(field: SocialField, value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  try {
    const { hostname, pathname } = new URL(/^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`)
    const onNetwork = SOCIAL_DOMAINS[field].some((d) => hostname === d || hostname.endsWith(`.${d}`))
    return onNetwork && pathname.replace(/\//g, '') !== ''
  } catch {
    return false
  }
}

/** `USD — US Dollar`. Display-only, so an absent or unknown code must not throw and take the page down. */
export function currencyLabel(code: string | undefined, language: string): string {
  if (!code) return ''
  const upper = code.toUpperCase()
  try {
    return `${upper} — ${new Intl.DisplayNames([language], { type: 'currency' }).of(upper)}`
  } catch {
    return upper
  }
}
