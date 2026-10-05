import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { usePermissions } from '@/components/feedback/Can'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { hasAnyPermission } from '@/utils/permissions'
import { useAgreementTemplate } from '../hooks/use-agreement-templates'
import { AGREEMENTS_PATH, NEW_TEMPLATE } from '../utils/agreement-template.utils'
import { AgreementTemplateEditor } from './AgreementTemplateEditor'
import { AgreementTemplateList } from './AgreementTemplateList'
import { CompanySignatoryCard } from './CompanySignatoryCard'

/**
 * The template list, or one template's editor on its own URL. The API lets the whole team read
 * templates, for the booking wizard; changing them is the owner's.
 */
export function AgreementTemplates() {
  const { t } = useTranslation('contracts')
  const { templateId } = useParams()
  const canManage = hasAnyPermission(usePermissions(), ['settings.manage'])

  if (!canManage) {
    return (
      <EmptyState
        icon={Lock}
        title={t('agreements.ownerOnly.title')}
        description={t('agreements.ownerOnly.description')}
      />
    )
  }
  if (!templateId) {
    return (
      <>
        <AgreementTemplateList />
        <CompanySignatoryCard />
      </>
    )
  }
  if (templateId === NEW_TEMPLATE) return <AgreementTemplateEditor />
  return <SavedTemplateEditor id={templateId} />
}

function SavedTemplateEditor({ id }: { id: string }) {
  const { t } = useTranslation('contracts')
  const navigate = useNavigate()
  const { data: template, isLoading } = useAgreementTemplate(id)

  if (isLoading) return <LoadingState />
  if (!template) {
    return (
      <ErrorState
        title={t('agreements.editor.notFound.title')}
        description={t('agreements.editor.notFound.description')}
        onRetry={() => navigate(AGREEMENTS_PATH)}
        actionLabel={t('agreements.editor.back')}
      />
    )
  }
  // Keyed by id, so moving between templates starts the form from that template's own text.
  return <AgreementTemplateEditor key={template.id} template={template} />
}
