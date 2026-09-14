import { ScrollText } from 'lucide-react'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { SETTINGS_SECTIONS } from '@/modules/settings/mock/settings.mock'
import { SettingsSection } from '@/modules/settings/components/SettingsSection'

export function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        description="Organization profile, rental policy and team access"
        actions={<PageActionButton icon={ScrollText} label="View audit log" />}
      />

      <div className="flex max-w-[880px] flex-col gap-4">
        {SETTINGS_SECTIONS.map((section) => (
          <SettingsSection key={section.title} section={section} />
        ))}
      </div>
    </PageContainer>
  )
}
