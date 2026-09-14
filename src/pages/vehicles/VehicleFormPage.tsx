import { Car } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { EmptyState } from '@/components/feedback/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'

export function VehicleFormPage() {
  const { vehicleId } = useParams()

  return (
    <PageContainer>
      <PageHeader title={vehicleId ? 'Edit vehicle' : 'Add vehicle'} description="Vehicle details and pricing" />
      <EmptyState icon={Car} title="Vehicle form coming soon" description="This module is being built next." />
    </PageContainer>
  )
}
