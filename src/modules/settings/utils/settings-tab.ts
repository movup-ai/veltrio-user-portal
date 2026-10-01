import { PAYMENT_SETTINGS_PATH } from '@/modules/payments/utils/payment-account.utils'

export type SettingsTab = 'general' | 'payments'

/** Which tab a settings route shows. Every route but Payments renders the general sections. */
export function settingsTab(pathname: string): SettingsTab {
  const payments = pathname === PAYMENT_SETTINGS_PATH || pathname.startsWith(`${PAYMENT_SETTINGS_PATH}/`)
  return payments ? 'payments' : 'general'
}
