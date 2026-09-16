import { ScrollText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { SETTINGS_SECTIONS } from '@/modules/settings/mock/settings.mock'
import { SettingsSection } from '@/modules/settings/components/SettingsSection'

export function SettingsPage() {
  const { t } = useTranslation('settings')

  return (
    <PageContainer>
      <PageHeader
        title={t('page.title')}
        description={t('page.description')}
        actions={<PageActionButton icon={ScrollText} label={t('page.auditLog')} />}
      />

      <div className="flex max-w-[880px] flex-col gap-4">
        {SETTINGS_SECTIONS.map((section) => (
          <SettingsSection key={section.key} section={section} />
        ))}
      </div>
    </PageContainer>
  )
}
