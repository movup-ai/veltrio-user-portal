import { CalendarClock } from 'lucide-react'
import { EmptyState } from '@/components/feedback/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'

export function BookingFormPage() {
  return (
    <PageContainer>
      <PageHeader title="New booking" description="Create a new rental booking" />
      <EmptyState icon={CalendarClock} title="Booking form coming soon" description="This module is being built next." />
    </PageContainer>
  )
}
