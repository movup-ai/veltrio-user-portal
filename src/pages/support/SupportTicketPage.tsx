import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { usePageBreadcrumb } from '@/components/navigation/usePageBreadcrumb'
import { TicketStatusNotice, TicketSummary } from '@/modules/support/components/TicketSummary'
import { TicketThread } from '@/modules/support/components/TicketThread'
import { useTicket } from '@/modules/support/hooks/use-support'
import { ticketBadgeStatus } from '@/modules/support/utils/support.utils'
import { isNotFound } from '@/services/api/errors'

export function SupportTicketPage() {
  const { ticketId } = useParams<{ ticketId: string }>()
  const { t } = useTranslation('support')
  const { data: ticket, isLoading, error, refetch } = useTicket(ticketId)
  usePageBreadcrumb(ticket ? `#${ticket.number}` : undefined)

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    )
  }
  // A failed refetch keeps the thread already shown; only a page with nothing to show errors.
  if (!ticket) {
    return (
      <PageContainer>
        <BackLink />
        {isNotFound(error) ? (
          <ErrorState title={t('ticket.notFoundTitle')} description={t('ticket.notFoundDescription')} />
        ) : (
          <ErrorState onRetry={() => void refetch()} />
        )}
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <BackLink />
      <PageHeader
        title={ticket.subject}
        badge={
          <StatusBadge status={ticketBadgeStatus(ticket.status)} label={t(`statuses.${ticket.status}`)} />
        }
        description={t('ticket.meta', {
          number: ticket.number,
          category: t(`categories.${ticket.category}`),
        })}
      />
      <div className="grid max-w-[1240px] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <TicketStatusNotice ticket={ticket} />
          <TicketThread ticket={ticket} />
        </div>
        {/* Sticky on a wide screen, so the ticket ID stays in view down a long thread. */}
        <div className="lg:sticky lg:top-4">
          <TicketSummary ticket={ticket} />
        </div>
      </div>
    </PageContainer>
  )
}

function BackLink() {
  const { t } = useTranslation('support')
  return (
    <Link
      to="/support"
      className="text-fg-3 hover:text-foreground focus-visible:outline-ring flex w-fit items-center gap-1.5 rounded-[7px] text-[13px] font-medium focus-visible:outline-2"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {t('ticket.back')}
    </Link>
  )
}
