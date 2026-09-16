import { CalendarClock } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/feedback/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'

export function BookingDetailsPage() {
  const { t } = useTranslation('bookings')
  const { bookingId } = useParams()

  return (
    <PageContainer>
      <PageHeader title={t('details.title', { id: bookingId })} description={t('details.description')} />
      <EmptyState
        icon={CalendarClock}
        title={t('details.comingSoonTitle')}
        description={t('details.comingSoonDescription')}
      />
    </PageContainer>
  )
}
