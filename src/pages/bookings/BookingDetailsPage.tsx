import { CalendarClock } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { EmptyState } from '@/components/feedback/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'

export function BookingDetailsPage() {
  const { bookingId } = useParams()

  return (
    <PageContainer>
      <PageHeader title={`Booking ${bookingId}`} description="Booking timeline, payments, and documents" />
      <EmptyState icon={CalendarClock} title="Booking details coming soon" description="This module is being built next." />
    </PageContainer>
  )
}
