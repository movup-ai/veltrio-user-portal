import { SOCIAL_DOMAINS, SOCIAL_HANDLE_MAX } from '../constants/company.constants'
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

/** Mirrors the API's company phone rule: digits with the usual separators, 7 to 15 of them. */
export function isPhoneNumber(value: string): boolean {
  const digits = value.replace(/\D/g, '').length
  return /^\+?[0-9(][0-9 ().-]*$/.test(value.trim()) && digits >= 7 && digits <= 15
}

/** A host before the first slash marks a link; "pages/Name" and "profile.php?id=1" have none. */
function isLink(value: string): boolean {
  return /^https?:\/\//.test(value) || /^[^/]*\.[^/]*\//.test(value)
}

/**
 * The username to store for whatever was typed: a username, an @handle, or a pasted link to
 * the field's own network. A link to anywhere else comes back as typed, for validation to refuse.
 */
export function toSocialHandle(field: SocialField, input: string): string {
  const typed = input.trim()
  if (!isLink(typed)) return typed.replace(/^@+|\/+$/g, '')
  try {
    const { hostname, pathname, search } = new URL(/^https?:\/\//.test(typed) ? typed : `https://${typed}`)
    const ownNetwork = SOCIAL_DOMAINS[field].some((d) => hostname === d || hostname.endsWith(`.${d}`))
    return ownNetwork ? (pathname + search).replace(/^[/@]+|\/+$/g, '') : typed
  } catch {
    return typed
  }
}

/** Mirrors the API's SocialHandle: blank is fine; otherwise a username, never a link. */
export function isSocialHandle(field: SocialField, input: string): boolean {
  const handle = toSocialHandle(field, input)
  return !/\s/.test(handle) && !isLink(handle) && handle.length <= SOCIAL_HANDLE_MAX
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
