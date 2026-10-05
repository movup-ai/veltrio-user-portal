import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { usePermissions } from '@/components/feedback/Can'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { AgreementTemplates } from '@/modules/contracts/components/AgreementTemplates'
import { agreementTemplatePath, NEW_TEMPLATE } from '@/modules/contracts/utils/agreement-template.utils'
import { hasAnyPermission } from '@/utils/permissions'

export function AgreementsPage() {
  const { t } = useTranslation('contracts')
  const navigate = useNavigate()
  const { templateId } = useParams()
  const canManage = hasAnyPermission(usePermissions(), ['settings.manage'])

  return (
    <PageContainer>
      <PageHeader
        title={t('agreements.title')}
        description={t('agreements.description')}
        actions={
          // On the list only: inside an editor the action would abandon what is being typed.
          !templateId &&
          canManage && (
            <PageActionButton
              icon={Plus}
              label={t('agreements.new')}
              variant="solid"
              onClick={() => navigate(agreementTemplatePath(NEW_TEMPLATE))}
            />
          )
        }
      />

      {/* Narrower than the page: terms are prose, and a full-width line is hard to read back. */}
      <div className="flex max-w-[960px] flex-col gap-4">
        <AgreementTemplates />
      </div>
    </PageContainer>
  )
}
