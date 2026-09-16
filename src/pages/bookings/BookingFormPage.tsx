import { CalendarClock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/feedback/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'

export function BookingFormPage() {
  const { t } = useTranslation('bookings')

  return (
    <PageContainer>
      <PageHeader title={t('form.title')} description={t('form.description')} />
      <EmptyState icon={CalendarClock} title={t('form.comingSoonTitle')} description={t('form.comingSoonDescription')} />
    </PageContainer>
  )
}
