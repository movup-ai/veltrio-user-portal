import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CopyCheck, Download, Plus, Repeat, UserX, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { FilterBar } from '@/components/data-display/FilterBar'
import { RecordTable } from '@/components/data-display/RecordTable'
import { SortSelect } from '@/components/data-display/SortSelect'
import { StatStrip } from '@/components/data-display/StatStrip'
import { Can } from '@/components/feedback/Can'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { toast } from '@/components/ui/use-toast'
import { useFormatters } from '@/i18n'
import { useDomainLabels } from '@/i18n/domain'
import { downloadCsv } from '@/lib/csv'
import { DEFAULT_PAGE_SIZE, ExportTooLargeError } from '@/lib/pagination'
import { useDebounced } from '@/lib/use-debounced'
import { customerApi } from '@/modules/customers/api/customer.api'
import { CustomerFormDialog } from '@/modules/customers/components/CustomerFormDialog'
import { useCustomerPage, useCustomerStats } from '@/modules/customers/hooks/use-customers'
import {
  CUSTOMER_SORTS,
  type CustomerSort,
  type CustomerStats,
} from '@/modules/customers/types/customer.types'
import {
  customerColumns,
  customerRow,
  customersCsv,
  repeatRate,
} from '@/modules/customers/utils/customer.utils'
import { normalizeApiError } from '@/services/api/errors'

export function CustomersPage() {
  const { t } = useTranslation('customers')
  const format = useFormatters()
  const domain = useDomainLabels()
  const navigate = useNavigate()
  const [sort, setSort] = useState<CustomerSort>('newest')
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const debouncedSearch = useDebounced(search)

  // Narrowing the list resets to page 1: page 4 of the old result is rarely page 4 of the new.
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const filterKey = `${sort}|${debouncedSearch}|${pageSize}`
  const [lastFilterKey, setLastFilterKey] = useState(filterKey)
  const [page, setPage] = useState(1)
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey)
    setPage(1)
  }

  const {
    data: pageData,
    isLoading,
    isError,
    refetch,
    isStale,
  } = useCustomerPage({ search: debouncedSearch, sort, page, pageSize })
  const { data: stats, isError: statsFailed, refetch: refetchStats } = useCustomerStats()
  // A dash until the totals load: a zero would say the customer book is empty.
  const figure = (show: (loaded: CustomerStats) => string) => (stats ? show(stats) : '—')
  const [exporting, setExporting] = useState(false)

  /** Exports everyone matching the search, not just the page on screen. */
  async function handleExport() {
    setExporting(true)
    try {
      const customers = await customerApi.exportAll({ search: debouncedSearch, sort })
      const rows = customersCsv(customers, {
        header: [
          t('columns.customer'),
          t('form.email'),
          t('columns.phone'),
          t('columns.licence'),
          t('columns.rentals'),
          t('columns.status'),
          t('columns.lifetimeValue'),
        ],
        active: domain.status('Active'),
        possibleDuplicate: t('list.possibleDuplicate'),
        currency: format.currency,
      })
      downloadCsv(rows, 'customers.csv')
    } catch (error) {
      // Past the cap the file would be short without saying so, so it is refused instead.
      const tooLarge = error instanceof ExportTooLargeError
      toast({
        title: t('list.exportFailed'),
        description: tooLarge
          ? t('list.exportTooLarge', { total: error.total, limit: error.limit })
          : normalizeApiError(error).message,
        variant: 'error',
      })
    } finally {
      setExporting(false)
    }
  }

  // The search the rows answer, not the one still being typed, trimmed as the query sends it.
  const searching = debouncedSearch.trim() !== ''
  const rows = (pageData?.items ?? []).map((customer) =>
    customerRow(
      customer,
      {
        possibleDuplicate: t('list.possibleDuplicate'),
        lifetimeValue: format.currency(customer.lifetimeValue),
      },
      [{ label: t('list.rowActions.view'), onClick: () => navigate(`/customers/${customer.id}`) }],
    ),
  )

  return (
    <PageContainer>
      <PageHeader
        title={t('list.title')}
        description={t('list.description')}
        actions={
          <>
            <PageActionButton
              icon={Download}
              label={t('list.export')}
              disabled={exporting}
              onClick={() => void handleExport()}
            />
            <Can permission="customers.create">
              <PageActionButton
                icon={Plus}
                label={t('list.addCustomer')}
                variant="solid"
                onClick={() => setAdding(true)}
              />
            </Can>
          </>
        }
      />

      <FilterBar
        searchPlaceholder={t('list.searchPlaceholder')}
        searchValue={search}
        onSearchChange={setSearch}
        filters={[]}
      />

      {statsFailed && !stats ? (
        <ErrorState className="py-6" description={t('list.statsError')} onRetry={() => refetchStats()} />
      ) : (
        <StatStrip
          stats={[
            {
              icon: Users,
              label: t('list.stats.total'),
              value: figure((s) => format.number(s.total)),
              note: t('list.stats.totalNote'),
            },
            {
              icon: Repeat,
              label: t('list.stats.repeatRate'),
              value: figure((s) => format.percent(repeatRate(s.repeat, s.rented))),
              note: t('list.stats.repeatRateNote'),
            },
            {
              icon: CopyCheck,
              label: t('list.stats.possibleDuplicates'),
              value: figure((s) => format.number(s.possibleDuplicates)),
              note: t('list.stats.possibleDuplicatesNote'),
            },
          ]}
        />
      )}

      {isLoading && !pageData ? (
        <LoadingState label={t('list.loading')} />
      ) : isError ? (
        <ErrorState description={t('list.loadError')} onRetry={() => refetch()} />
      ) : (
        // Dimmed while the next page loads: the rows on screen belong to the previous filters.
        <div
          className={cn('transition-opacity', isStale && 'pointer-events-none opacity-60')}
          aria-busy={isStale}
        >
          <RecordTable
            title={t('list.tableTitle')}
            columns={customerColumns(t)}
            rows={rows}
            actions={
              <SortSelect
                label={t('list.sort.label')}
                value={sort}
                options={CUSTOMER_SORTS.map((value) => ({ value, label: t(`list.sort.${value}`) }))}
                onChange={(value) => setSort(value as CustomerSort)}
              />
            }
            pagination={
              pageData
                ? {
                    page: pageData.page,
                    pageSize,
                    total: pageData.total,
                    onPageChange: setPage,
                    onPageSizeChange: setPageSize,
                  }
                : undefined
            }
            minWidth="860px"
            onRowClick={(key) => navigate(`/customers/${key}`)}
            emptyState={
              <EmptyState
                icon={UserX}
                title={t(searching ? 'list.noMatchesTitle' : 'list.emptyTitle')}
                description={t(searching ? 'list.noMatchesDescription' : 'list.emptyDescription')}
              />
            }
          />
        </div>
      )}

      <CustomerFormDialog open={adding} onOpenChange={setAdding} />
    </PageContainer>
  )
}
