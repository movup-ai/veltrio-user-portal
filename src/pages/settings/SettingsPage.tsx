import { ScrollText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { StripeAccountCard } from '@/modules/payments/components/StripeAccountCard'
import { BrandSettings } from '@/modules/settings/components/BrandSettings'
import { CompanySettings } from '@/modules/settings/components/CompanySettings'
import { SettingsTabs } from '@/modules/settings/components/SettingsTabs'
import { settingsTab } from '@/modules/settings/utils/settings-tab'

export function SettingsPage() {
  const { t } = useTranslation('settings')
  const { pathname } = useLocation()
  const tab = settingsTab(pathname)

  return (
    <PageContainer>
      <PageHeader
        title={t('page.title')}
        description={t('page.description')}
        actions={<PageActionButton icon={ScrollText} label={t('page.auditLog')} />}
      />

      {/* One width for every tab, set by Brand's form and preview side by side, so switching tabs doesn't jump. */}
      <div className="flex max-w-[1240px] flex-col gap-4">
        <SettingsTabs />
        {tab === 'payments' && <StripeAccountCard />}
        {tab === 'brand' && <BrandSettings />}
        {tab === 'general' && <CompanySettings />}
      </div>
    </PageContainer>
  )
}
