import { describe, expect, it } from 'vitest'
import { settingsTab } from './settings-tab'

describe('settingsTab', () => {
  it('keeps General selected on every settings page that shows the general sections', () => {
    // These routes render General; matching only /settings left them with no tab selected.
    for (const path of [
      '/settings',
      '/settings/users',
      '/settings/roles',
      '/settings/billing',
    ]) {
      expect(settingsTab(path)).toBe('general')
    }
  })

  it('selects Payments on the payments page only', () => {
    expect(settingsTab('/settings/payments')).toBe('payments')
    expect(settingsTab('/settings/paymentsish')).toBe('general')
  })
})
