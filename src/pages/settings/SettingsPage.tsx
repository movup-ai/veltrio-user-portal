import { ScrollText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'
import { StripeAccountCard } from '@/modules/payments/components/StripeAccountCard'
import { PAYMENT_SETTINGS_PATH } from '@/modules/payments/utils/payment-account.utils'
import { SETTINGS_SECTIONS } from '@/modules/settings/mock/settings.mock'
import { SettingsSection } from '@/modules/settings/components/SettingsSection'
import { SettingsTabs } from '@/modules/settings/components/SettingsTabs'

export function SettingsPage() {
  const { t } = useTranslation('settings')
  const { pathname } = useLocation()
  const showingPayments = pathname.startsWith(PAYMENT_SETTINGS_PATH)

  return (
    <PageContainer>
      <PageHeader
        title={t('page.title')}
        description={t('page.description')}
        actions={<PageActionButton icon={ScrollText} label={t('page.auditLog')} />}
      />

      {/* Payments sits beside a section rail, so it needs more room than the field grids. */}
      <div className={cn('flex flex-col gap-4', showingPayments ? 'max-w-[1120px]' : 'max-w-[880px]')}>
        <SettingsTabs />
        {showingPayments ? (
          <StripeAccountCard />
        ) : (
          SETTINGS_SECTIONS.map((section) => <SettingsSection key={section.key} section={section} />)
        )}
      </div>
    </PageContainer>
  )
}
