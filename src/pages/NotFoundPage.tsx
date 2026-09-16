import { FileQuestion } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/feedback/EmptyState'

export function NotFoundPage() {
  const { t } = useTranslation('common')

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <EmptyState
        icon={FileQuestion}
        title={t('notFound.title')}
        description={t('notFound.description')}
        action={
          <Button asChild>
            <Link to="/app/dashboard">{t('notFound.backToDashboard')}</Link>
          </Button>
        }
      />
    </div>
  )
}
