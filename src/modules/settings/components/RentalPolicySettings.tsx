import { usePermissions } from '@/components/feedback/Can'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { hasAnyPermission } from '@/utils/permissions'
import { useCompany } from '../hooks/use-company'
import { AdditionalDriverCard } from './AdditionalDriverCard'
import { CancellationPolicyCard } from './CancellationPolicyCard'

/**
 * The cancellation policy and the additional-driver price on the Payments tab. The API serves
 * the company to its owner only, and the tab's Stripe card already tells everyone else these
 * settings are the owner's.
 */
export function RentalPolicySettings() {
  const canManage = hasAnyPermission(usePermissions(), ['settings.manage'])
  const { data: company, isLoading, isError, refetch } = useCompany(canManage)

  if (!canManage) return null
  if (isLoading) return <LoadingState />
  if (isError || !company) return <ErrorState onRetry={() => void refetch()} />
  return (
    <>
      <CancellationPolicyCard company={company} />
      <AdditionalDriverCard company={company} />
    </>
  )
}
