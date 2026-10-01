import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { PAYMENT_SETTINGS_PATH } from '@/modules/payments/utils/payment-account.utils'

const TABS = [
  // `end`: every other settings path sits under /app/settings, which would keep General lit.
  { key: 'general', to: '/app/settings', end: true },
  { key: 'payments', to: PAYMENT_SETTINGS_PATH, end: false },
] as const

/** Links rather than tabs: each has its own URL, which Stripe's return links rely on. */
export function SettingsTabs() {
  const { t } = useTranslation('settings')

  return (
    <nav aria-label={t('tabs.label')} className="bg-surface-3 flex w-fit gap-0.5 rounded-[9px] p-[3px]">
      {TABS.map((tab) => (
        <NavLink
          key={tab.key}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              'text-meta rounded-[7px] px-3 py-1.5 whitespace-nowrap transition-colors',
              isActive ? 'bg-surface text-foreground shadow-xs' : 'text-fg-3 hover:text-foreground',
            )
          }
        >
          {t(`tabs.${tab.key}`)}
        </NavLink>
      ))}
    </nav>
  )
}
