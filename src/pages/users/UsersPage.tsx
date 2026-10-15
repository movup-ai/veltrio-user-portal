import { useState } from 'react'
import { Lock, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@/components/feedback/Can'
import { EmptyState } from '@/components/feedback/EmptyState'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { InvitationSentDialog } from '@/modules/users/components/InvitationSentDialog'
import { InviteDialog } from '@/modules/users/components/InviteDialog'
import { MembersSection } from '@/modules/users/components/MembersSection'
import { PendingInvitations } from '@/modules/users/components/PendingInvitations'
import type { SentInvitation } from '@/modules/users/types/users.types'
import { hasAnyPermission } from '@/utils/permissions'

/** The company's team. The API shows it to owners only, so anyone else who lands here gets a notice. */
export function UsersPage() {
  const { t } = useTranslation('settings')
  const canManage = hasAnyPermission(usePermissions(), ['users.manage'])
  const [inviting, setInviting] = useState(false)
  const [sent, setSent] = useState<SentInvitation>()

  return (
    <PageContainer>
      <PageHeader
        title={t('users.page.title')}
        description={t('users.page.description')}
        actions={
          canManage && (
            <PageActionButton
              icon={UserPlus}
              label={t('users.invite.open')}
              variant="solid"
              onClick={() => setInviting(true)}
            />
          )
        }
      />

      {canManage ? (
        <div className="flex max-w-[1240px] flex-col gap-4">
          <MembersSection />
          <PendingInvitations onSent={setSent} />
        </div>
      ) : (
        <EmptyState
          icon={Lock}
          title={t('users.ownerOnly.title')}
          description={t('users.ownerOnly.description')}
        />
      )}

      <InviteDialog open={inviting} onOpenChange={setInviting} onSent={setSent} />
      <InvitationSentDialog invitation={sent} onOpenChange={(open) => !open && setSent(undefined)} />
    </PageContainer>
  )
}
