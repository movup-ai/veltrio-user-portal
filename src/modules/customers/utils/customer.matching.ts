import type { CustomerMatchInput } from '../types/customer.types'

/** Mirrors the API: fewer digits than a local number is someone still typing. */
const MIN_PHONE_DIGITS = 7

/**
 * Whether anything typed so far could identify a customer on file. A name alone cannot — two
 * people share one — so it only counts beside a date of birth, as it does on the API.
 */
export function hasEnoughToMatch(input: CustomerMatchInput): boolean {
  const phoneDigits = (input.phone ?? '').replace(/\D/g, '').length
  return Boolean(
    input.email?.includes('@') ||
    input.licenceNumber?.trim() ||
    phoneDigits >= MIN_PHONE_DIGITS ||
    (input.name?.trim() && input.dateOfBirth),
  )
}
