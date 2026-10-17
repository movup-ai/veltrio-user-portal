import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmailPreferencesCard } from '@/modules/notifications/components/EmailPreferencesCard'
import { NOTIFICATIONS_PATH } from '@/modules/notifications/utils/notifications.utils'

/** Each member's own, so not under Settings, which only owners can change. Notification emails link here. */
export function NotificationSettingsPage() {
  const { t } = useTranslation('notifications')
  const navigate = useNavigate()

  return (
    <PageContainer>
      <PageHeader
        title={t('settings.title')}
        description={t('settings.description')}
        actions={
          <PageActionButton
            icon={ArrowLeft}
            label={t('page.title')}
            onClick={() => navigate(NOTIFICATIONS_PATH)}
          />
        }
      />
      <div className="max-w-[1240px]">
        <EmailPreferencesCard />
      </div>
    </PageContainer>
  )
}
