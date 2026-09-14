import { Car } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { EmptyState } from '@/components/feedback/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'

export function VehicleDetailsPage() {
  const { vehicleId } = useParams()

  return (
    <PageContainer>
      <PageHeader title={`Vehicle ${vehicleId}`} description="Vehicle details, history, and documents" />
      <EmptyState icon={Car} title="Vehicle details coming soon" description="This module is being built next." />
    </PageContainer>
  )
}
