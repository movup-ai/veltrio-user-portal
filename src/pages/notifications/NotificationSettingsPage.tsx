import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmailPreferencesCard } from '@/modules/notifications/components/EmailPreferencesCard'
import { NOTIFICATIONS_PATH } from '@/modules/notifications/utils/notifications.utils'

/** Each member's own, so not under Settings, which only owners can change. Notification emails link here. */
export function NotificationSettingsPage() {
  const { t } = useTranslation('notifications')

  return (
    <PageContainer>
      <div className="flex flex-col gap-3">
        <PageHeader title={t('settings.title')} description={t('settings.description')} />
        <Link
          to={NOTIFICATIONS_PATH}
          className="text-fg-3 hover:text-foreground focus-visible:outline-ring flex w-fit items-center gap-1.5 rounded-[7px] text-[13px] font-medium transition-colors focus-visible:outline-2"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t('settings.back')}
        </Link>
      </div>
      <div className="max-w-[1240px]">
        <EmailPreferencesCard />
      </div>
    </PageContainer>
  )
}
