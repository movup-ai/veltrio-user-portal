import { BILLING_SETTINGS_PATH } from '@/modules/billing/utils/billing.utils'
import { PAYMENT_SETTINGS_PATH } from '@/modules/payments/utils/payment-account.utils'

export type SettingsTab = 'general' | 'brand' | 'payments' | 'billing'

export const BRAND_SETTINGS_PATH = '/settings/brand'

function under(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`)
}

/** Which tab a settings route shows. Every route but Brand, Payments and Billing renders the general sections. */
export function settingsTab(pathname: string): SettingsTab {
  if (under(pathname, PAYMENT_SETTINGS_PATH)) return 'payments'
  if (under(pathname, BRAND_SETTINGS_PATH)) return 'brand'
  if (under(pathname, BILLING_SETTINGS_PATH)) return 'billing'
  return 'general'
}
