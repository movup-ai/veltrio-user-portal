import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { PAYMENT_SETTINGS_PATH } from '@/modules/payments/utils/payment-account.utils'
import { BRAND_SETTINGS_PATH, settingsTab, type SettingsTab } from '../utils/settings-tab'

const TABS: { key: SettingsTab; to: string }[] = [
  { key: 'general', to: '/settings' },
  { key: 'brand', to: BRAND_SETTINGS_PATH },
  { key: 'payments', to: PAYMENT_SETTINGS_PATH },
]

/**
 * Links rather than tabs: each has its own URL, which Stripe's return links rely on. Selection
 * comes from `settingsTab` rather than NavLink matching, since General owns several routes.
 */
export function SettingsTabs() {
  const { t } = useTranslation('settings')
  const current = settingsTab(useLocation().pathname)

  return (
    <nav aria-label={t('tabs.label')} className="bg-surface-3 flex w-fit gap-0.5 rounded-[9px] p-[3px]">
      {TABS.map((tab) => {
        const active = tab.key === current
        return (
          <Link
            key={tab.key}
            to={tab.to}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'text-meta rounded-[7px] px-3 py-1.5 whitespace-nowrap transition-colors',
              active ? 'bg-surface text-foreground shadow-xs' : 'text-fg-3 hover:text-foreground',
            )}
          >
            {t(`tabs.${tab.key}`)}
          </Link>
        )
      })}
    </nav>
  )
}
