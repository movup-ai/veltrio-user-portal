import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@/components/feedback/Can'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { hasAnyPermission } from '@/utils/permissions'
import { useCompany } from '../hooks/use-company'
import { CompanyProfileCard } from './CompanyProfileCard'
import { ContactCard } from './ContactCard'
import { LocalizationCard } from './LocalizationCard'
import { SocialLinksCard } from './SocialLinksCard'

/** The General tab. The API serves the company to its owner only, so others get a notice. */
export function CompanySettings() {
  const { t } = useTranslation('settings')
  const canManage = hasAnyPermission(usePermissions(), ['settings.manage'])
  const { data: company, isLoading, isError, refetch } = useCompany(canManage)

  if (!canManage) {
    return <EmptyState icon={Lock} title={t('company.ownerOnly.title')} description={t('company.ownerOnly.description')} />
  }
  if (isLoading) return <LoadingState />
  if (isError || !company) return <ErrorState onRetry={() => void refetch()} />

  return (
    <>
      <CompanyProfileCard company={company} />
      <LocalizationCard company={company} />
      <ContactCard company={company} />
      <SocialLinksCard company={company} />
    </>
  )
}
