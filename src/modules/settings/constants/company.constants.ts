import type { SocialField } from '../types/company.types'

/** What a username is written after on a network's profile link; TikTok's carry the @. */
export const SOCIAL_HANDLE_PREFIX: Partial<Record<SocialField, string>> = { tiktokHandle: '@' }

/** Mirrors the API's handle length limit. */
export const SOCIAL_HANDLE_MAX = 100

/**
 * Mirrors each network's username format in the API (app/modules/tenants/schemas.py). Facebook
 * also takes the two longer forms it still serves: profile.php?id=1 and pages/Name/1.
 */
export const SOCIAL_HANDLE_PATTERN: Record<SocialField, RegExp> = {
  instagramHandle: /^[A-Za-z0-9._]{1,30}$/,
  facebookHandle: /^(profile\.php\?id=[0-9]+|[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+){0,2})$/,
  xHandle: /^[A-Za-z0-9_]{1,15}$/,
  tiktokHandle: /^[A-Za-z0-9._]{1,24}$/,
}

/** Mirrors the API's Description limit. */
export const DESCRIPTION_MAX = 500

/**
 * Mirrors SUPPORTED_CURRENCIES in the API (app/modules/tenants/schemas.py): two-decimal currencies
 * only, since amounts are stored in hundredths and Stripe reads JPY or KWD in other units.
 */
export const SUPPORTED_CURRENCIES = [
  'USD', 'CAD', 'MXN', 'BRL', 'ARS', 'COP', 'PEN', 'CRC', 'DOP', 'GTQ',
  'EUR', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'RON', 'TRY',
  'AUD', 'NZD', 'SGD', 'HKD', 'INR', 'MYR', 'THB', 'PHP',
  'AED', 'SAR', 'QAR', 'ILS', 'ZAR',
] as const

/** Each network's domains, to recognise a pasted link as its own; the first is shown as the prefix. */
export const SOCIAL_DOMAINS: Record<SocialField, readonly string[]> = {
  instagramHandle: ['instagram.com'],
  facebookHandle: ['facebook.com', 'fb.com'],
  xHandle: ['x.com', 'twitter.com'],
  tiktokHandle: ['tiktok.com'],
}
