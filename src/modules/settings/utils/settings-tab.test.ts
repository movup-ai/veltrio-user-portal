import { describe, expect, it } from 'vitest'
import { settingsTab } from './settings-tab'

describe('settingsTab', () => {
  it('keeps General selected on every settings page that shows the general sections', () => {
    // These routes render General; matching only /settings left them with no tab selected.
    for (const path of ['/settings', '/settings/users', '/settings/roles']) {
      expect(settingsTab(path)).toBe('general')
    }
  })

  it('selects Billing on the billing page only', () => {
    expect(settingsTab('/settings/billing')).toBe('billing')
    expect(settingsTab('/settings/billingish')).toBe('general')
  })

  it('selects Brand on the brand page only', () => {
    expect(settingsTab('/settings/brand')).toBe('brand')
    expect(settingsTab('/settings/brandish')).toBe('general')
  })

  it('selects Payments on the payments page only', () => {
    expect(settingsTab('/settings/payments')).toBe('payments')
    expect(settingsTab('/settings/paymentsish')).toBe('general')
  })
})
