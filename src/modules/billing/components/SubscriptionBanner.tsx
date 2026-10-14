import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { usePermissions } from '@/components/feedback/Can'
import { hasAnyPermission } from '@/utils/permissions'
import { useBilling } from '../hooks/use-billing'
import { BILLING_SETTINGS_PATH, bannerFor } from '../utils/billing.utils'

/**
 * Says, on every page, that the plan needs attention: none is running, so adding a vehicle or
 * taking a booking is refused, or its last payment failed. Left off the Billing tab, which says
 * the same thing in full.
 */
export function SubscriptionBanner() {
  const { t } = useTranslation('settings')
  const { data: billing } = useBilling()
  const isOwner = hasAnyPermission(usePermissions(), ['settings.manage'])
  const { pathname } = useLocation()

  const banner = billing && bannerFor(billing, isOwner)
  if (!banner || pathname === BILLING_SETTINGS_PATH) return null

  return (
    <div
      role="status"
      className="bg-warning-tint text-fg-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-6 py-2.5 text-[13px]"
    >
      <AlertTriangle className="text-warning size-4 shrink-0" aria-hidden />
      <p className="m-0">{t(`billing.banner.${banner}`)}</p>
      {isOwner && (
        <Link to={BILLING_SETTINGS_PATH} className="text-primary font-semibold hover:underline">
          {t('billing.banner.action')}
        </Link>
      )}
    </div>
  )
}
