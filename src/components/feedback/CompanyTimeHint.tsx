import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useOrganizationStore } from '@/state/organization.store'
import { awayFromCompanyTime, zoneName } from '@/utils/company-time'

/** Says whose clock the times beside it are on. Renders nothing for staff already on it. */
export function CompanyTimeHint({ className }: { className?: string }) {
  const { t } = useTranslation('common')
  // Subscribed so the hint follows a change of the company's zone in settings.
  const timeZone = useOrganizationStore((state) => state.membership?.timezone)
  const [now] = useState(() => Date.now())
  if (!timeZone || !awayFromCompanyTime(now, timeZone)) return null
  return (
    <p className={cn('text-description', className)}>{t('companyTime', { zone: zoneName(now, timeZone) })}</p>
  )
}
