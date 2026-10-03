import { ScrollText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'
import { StripeAccountCard } from '@/modules/payments/components/StripeAccountCard'
import { BrandSettings } from '@/modules/settings/components/BrandSettings'
import { CompanySettings } from '@/modules/settings/components/CompanySettings'
import { SettingsTabs } from '@/modules/settings/components/SettingsTabs'
import { settingsTab } from '@/modules/settings/utils/settings-tab'

const TAB_WIDTH = { general: 'max-w-[960px]', payments: 'max-w-[1120px]', brand: 'max-w-[1240px]' } as const

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

      {/* Payments sits beside a section rail and Brand beside its preview, so both need more room. */}
      <div className={cn('flex flex-col gap-4', TAB_WIDTH[tab])}>
        <SettingsTabs />
        {tab === 'payments' && <StripeAccountCard />}
        {tab === 'brand' && <BrandSettings />}
        {tab === 'general' && <CompanySettings />}
      </div>
    </PageContainer>
  )
}
