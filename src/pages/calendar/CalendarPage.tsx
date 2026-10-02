import { CalendarDays } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/feedback/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'

/** Placeholder: the nav entry ships first so the slot is reserved, the views come after. */
export function CalendarPage() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()

  return (
    <PageContainer>
      <PageHeader title={t('calendar.title')} description={t('calendar.description')} />
      <EmptyState
        icon={CalendarDays}
        title={t('calendar.empty.title')}
        description={t('calendar.empty.description')}
        action={
          <Button variant="outline" onClick={() => navigate('/bookings')}>
            {t('calendar.empty.action')}
          </Button>
        }
      />
    </PageContainer>
  )
}
