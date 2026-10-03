import type { SocialField } from '../types/company.types'

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

/** Mirrors the API's per-network host check (app/modules/tenants/schemas.py); the first is shown. */
export const SOCIAL_DOMAINS: Record<SocialField, readonly string[]> = {
  instagramUrl: ['instagram.com'],
  facebookUrl: ['facebook.com', 'fb.com'],
  xUrl: ['x.com', 'twitter.com'],
  tiktokUrl: ['tiktok.com'],
}
