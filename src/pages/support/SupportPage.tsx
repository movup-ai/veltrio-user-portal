import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Inbox, Plus } from 'lucide-react'
import { RecordTable } from '@/components/data-display/RecordTable'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useFormatters } from '@/i18n'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { NewTicketDialog } from '@/modules/support/components/NewTicketDialog'
import { useTicketPage } from '@/modules/support/hooks/use-support'
import { TICKET_STATUSES, type TicketStatus } from '@/modules/support/types/support.types'
import { ticketColumns, ticketRow } from '@/modules/support/utils/support.utils'

const TABS = ['all', ...TICKET_STATUSES] as const
type Tab = (typeof TABS)[number]

/** The company's tickets to Veltrio. Reachable while the company is suspended, as the API is. */
export function SupportPage() {
  const { t } = useTranslation('support')
  const format = useFormatters()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('all')
  const [creating, setCreating] = useState(false)

  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const filterKey = `${tab}|${pageSize}`
  const [lastFilterKey, setLastFilterKey] = useState(filterKey)
  const [page, setPage] = useState(1)
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey)
    setPage(1)
  }

  const status: TicketStatus | undefined = tab === 'all' ? undefined : tab
  const { data, isLoading, isError, refetch } = useTicketPage({ status, page, pageSize })

  const rows = (data?.items ?? []).map((ticket) =>
    ticketRow(ticket, {
      category: t(`categories.${ticket.category}`),
      status: t(`statuses.${ticket.status}`),
      lastUpdated: format.dateTime(ticket.lastMessageAt),
    }),
  )

  return (
    <PageContainer>
      <PageHeader
        title={t('page.title')}
        description={t('page.description')}
        actions={
          <PageActionButton
            icon={Plus}
            label={t('page.newTicket')}
            variant="solid"
            onClick={() => setCreating(true)}
          />
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <div className="max-w-[1240px]">
          <RecordTable
            title={t('page.tableTitle')}
            tabs={TABS.map((key) => ({
              key,
              label: t(`tabs.${key}`),
              selected: tab === key,
              onClick: () => setTab(key),
            }))}
            columns={ticketColumns(t)}
            rows={rows}
            minWidth="900px"
            comfortable
            onRowClick={(key) => navigate(`/support/${key}`)}
            pagination={
              data
                ? {
                    page: data.page,
                    pageSize,
                    total: data.total,
                    onPageChange: setPage,
                    onPageSizeChange: setPageSize,
                  }
                : undefined
            }
            emptyState={
              <EmptyState
                icon={Inbox}
                title={t(tab === 'all' ? 'page.emptyTitle' : 'page.noMatchesTitle')}
                description={t(tab === 'all' ? 'page.emptyDescription' : 'page.noMatchesDescription')}
              />
            }
          />
        </div>
      )}

      <NewTicketDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(ticket) => navigate(`/support/${ticket.id}`)}
      />
    </PageContainer>
  )
}
