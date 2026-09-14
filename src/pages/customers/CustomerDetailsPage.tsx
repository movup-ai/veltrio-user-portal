import { Users } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { EmptyState } from '@/components/feedback/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'

export function CustomerDetailsPage() {
  const { customerId } = useParams()

  return (
    <PageContainer>
      <PageHeader title={`Customer ${customerId}`} description="Customer profile, bookings, and payment history" />
      <EmptyState icon={Users} title="Customer details coming soon" description="This module is being built next." />
    </PageContainer>
  )
}
