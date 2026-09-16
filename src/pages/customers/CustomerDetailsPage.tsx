import { Users } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/feedback/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'

export function CustomerDetailsPage() {
  const { t } = useTranslation('customers')
  const { customerId } = useParams()

  return (
    <PageContainer>
      <PageHeader title={t('details.title', { id: customerId })} description={t('details.description')} />
      <EmptyState icon={Users} title={t('details.comingSoonTitle')} description={t('details.comingSoonDescription')} />
    </PageContainer>
  )
}
