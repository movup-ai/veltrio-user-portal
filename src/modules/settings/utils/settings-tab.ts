import { PAYMENT_SETTINGS_PATH } from '@/modules/payments/utils/payment-account.utils'

export type SettingsTab = 'general' | 'brand' | 'payments'

export const BRAND_SETTINGS_PATH = '/settings/brand'

function under(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`)
}

/** Which tab a settings route shows. Every route but Brand and Payments renders the general sections. */
export function settingsTab(pathname: string): SettingsTab {
  if (under(pathname, PAYMENT_SETTINGS_PATH)) return 'payments'
  if (under(pathname, BRAND_SETTINGS_PATH)) return 'brand'
  return 'general'
}
