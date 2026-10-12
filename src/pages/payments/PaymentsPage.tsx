import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Banknote, CreditCard, Download, ReceiptText, ShieldCheck, WalletCards } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { FilterBar } from '@/components/data-display/FilterBar'
import { RecordTable } from '@/components/data-display/RecordTable'
import { StatStrip } from '@/components/data-display/StatStrip'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { EMPTY_DATE_RANGE, type DateRange } from '@/components/ui/date-range-picker'
import { toast } from '@/components/ui/use-toast'
import { useFormatters } from '@/i18n'
import { useDomainLabels } from '@/i18n/domain'
import { downloadCsv } from '@/lib/csv'
import { dateRangeLabel } from '@/lib/date-range'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { useDebounced } from '@/lib/use-debounced'
import { paymentApi } from '@/modules/payments/api/payment.api'
import {
  usePaymentMethodsInUse,
  usePaymentPage,
  usePaymentReceipt,
  usePaymentStats,
} from '@/modules/payments/hooks/use-payments'
import {
  CARD_METHOD,
  PAYMENT_STATES,
  PAYMENT_TABS,
  PAYOUT_STATUSES,
  type PaymentRowState,
  type PaymentStats,
  type PaymentTab,
} from '@/modules/payments/types/payment.types'
import {
  hasReceipt,
  isOwnWorded,
  paymentColumns,
  paymentRow,
  payoutsCsv,
  sharedStatus,
} from '@/modules/payments/utils/payment.utils'
import { normalizeApiError } from '@/services/api/errors'

export function PaymentsPage() {
  const { t } = useTranslation('payments')
  const { t: tCommon } = useTranslation('common')
  const format = useFormatters()
  const domain = useDomainLabels()
  const navigate = useNavigate()
  const [tab, setTab] = useState<PaymentTab>('All')
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState<PaymentRowState | 'Any'>('Any')
  const [methodFilter, setMethodFilter] = useState<string>('All')
  const [period, setPeriod] = useState<DateRange>(EMPTY_DATE_RANGE)
  const debouncedSearch = useDebounced(search)

  // Narrowing the list resets to page 1: page 4 of the old result is rarely page 4 of the new.
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const filterKey = [tab, debouncedSearch, stateFilter, methodFilter, period.from, period.to, pageSize].join(
    '|',
  )
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
    isFetching,
    refetch,
    isStale,
  } = usePaymentPage({
    search: debouncedSearch,
    tab,
    state: stateFilter,
    method: methodFilter,
    period,
    page,
    pageSize,
  })
  // A link withdrawn elsewhere can leave the page asked for past the end, empty while earlier
  // ones hold rows. Only a settled answer says so: the previous page's rows are a placeholder.
  if (pageData && !isStale && !isFetching && pageData.page < page) setPage(pageData.page)

  const { data: stats, isError: statsFailed, refetch: refetchStats } = usePaymentStats()
  // A dash until the totals load: a zero would say nothing was collected or is owed.
  const figure = (show: (loaded: PaymentStats) => string) => (stats ? show(stats) : '—')
  const { data: methods = [] } = usePaymentMethodsInUse()
  const receipt = usePaymentReceipt()
  const [reporting, setReporting] = useState(false)
  const payments = pageData?.items ?? []

  /** A card is one choice whichever card it was; every other method reads as it was written. */
  const methodLabel = (method: string) => (method === CARD_METHOD ? t('list.methodCard') : method)

  // The badge's own words, so the filter and the row it finds never read differently.
  const stateLabel = (state: PaymentRowState) =>
    isOwnWorded(state) ? t(`list.state.${state}`) : domain.status(sharedStatus(state))

  // A payment's money is managed on its booking, so that is where a row leads.
  const openBooking = (paymentId: string) => {
    const payment = payments.find((p) => p.id === paymentId)
    if (payment) navigate(`/bookings/${payment.bookingReference}`)
  }

  /** Stripe's payouts to the bank in the chosen period, or all of them: the API refuses a report too long to be whole. */
  async function handlePayoutReport() {
    setReporting(true)
    try {
      const payouts = await paymentApi.payouts(period)
      // An empty file would look like a broken download, so say there is nothing instead.
      if (payouts.length === 0) {
        toast({ title: t('list.report.empty'), description: t('list.report.emptyDescription') })
        return
      }
      const rows = payoutsCsv(payouts, {
        header: [
          t('list.report.header.arrivalDate'),
          t('list.report.header.status'),
          t('list.report.header.amount'),
          t('list.report.header.bank'),
          t('list.report.header.note'),
          t('list.report.header.id'),
        ],
        status: (status) => {
          const known = PAYOUT_STATUSES.find((value) => value === status)
          return known ? t(`list.report.status.${known}`) : status
        },
        currency: format.currency,
      })
      downloadCsv(rows, 'payouts.csv')
    } catch (error) {
      toast({
        title: t('list.report.failed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    } finally {
      setReporting(false)
    }
  }

  const rows = payments.map((payment) =>
    paymentRow(
      payment,
      {
        kind: t(`booking.kind.${payment.kind}`),
        date: format.date(payment.at, { month: 'short', day: 'numeric', year: 'numeric' }),
        amount: format.currency(payment.amount, payment.currency),
        held: t('list.state.held'),
        released: t('list.state.released'),
        partlyRefunded: t('list.partlyRefunded', {
          amount: format.currency(payment.refunded, payment.currency),
        }),
      },
      [
        { label: t('list.rowActions.viewBooking'), onClick: () => openBooking(payment.id) },
        ...(hasReceipt(payment)
          ? [{ label: t('list.rowActions.downloadReceipt'), onClick: () => receipt.mutate(payment) }]
          : []),
      ],
    ),
  )

  return (
    <PageContainer>
      <PageHeader
        title={t('list.title')}
        description={t('list.description')}
        actions={
          <PageActionButton
            icon={Download}
            label={t('list.payoutReport')}
            disabled={reporting}
            onClick={() => void handlePayoutReport()}
          />
        }
      />

      <FilterBar
        searchPlaceholder={t('list.searchPlaceholder')}
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            label: t('list.filters.status'),
            value: stateFilter === 'Any' ? tCommon('filters.any') : stateLabel(stateFilter),
            options: [
              { value: 'Any', label: tCommon('filters.any') },
              ...PAYMENT_STATES.map((state) => ({ value: state, label: stateLabel(state) })),
            ],
            onChange: (value) => setStateFilter(value as PaymentRowState | 'Any'),
          },
          {
            label: t('list.filters.method'),
            value: methodFilter === 'All' ? tCommon('filters.all') : methodLabel(methodFilter),
            options: [
              { value: 'All', label: tCommon('filters.all') },
              ...methods.map((method) => ({ value: method, label: methodLabel(method) })),
            ],
            onChange: setMethodFilter,
          },
          {
            kind: 'dateRange',
            label: t('list.filters.period'),
            value: dateRangeLabel(period, format.shortDate, t('list.filters.periodAny')),
            range: period,
            onChange: setPeriod,
          },
        ]}
      />

      {statsFailed && !stats ? (
        <ErrorState className="py-6" description={t('list.statsError')} onRetry={() => refetchStats()} />
      ) : (
        <StatStrip
          stats={[
            {
              icon: Banknote,
              label: t('list.stats.collected'),
              value: figure((s) => format.currency(s.collected)),
              note: figure((s) => t('list.stats.collectedNote', { amount: format.currency(s.refunded) })),
            },
            {
              icon: ReceiptText,
              label: t('list.stats.outstanding'),
              value: figure((s) => format.currency(s.outstanding)),
              note: figure((s) => t('list.stats.outstandingNote', { count: s.outstandingBookings })),
            },
            {
              icon: CreditCard,
              label: t('list.stats.failed'),
              value: figure((s) => format.number(s.failed)),
              note: t('list.stats.failedNote'),
            },
            {
              icon: ShieldCheck,
              label: t('list.stats.held'),
              value: figure((s) => format.currency(s.held)),
              note: figure((s) => t('list.stats.heldNote', { count: s.heldCount })),
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
            tabs={PAYMENT_TABS.map((value) => ({
              key: value,
              label: t(`list.tabs.${value}`),
              selected: tab === value,
              onClick: () => setTab(value),
            }))}
            columns={paymentColumns(t)}
            rows={rows}
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
            minWidth="840px"
            onRowClick={openBooking}
            emptyState={
              <EmptyState
                icon={WalletCards}
                title={t('list.emptyTitle')}
                description={t('list.emptyDescription')}
              />
            }
          />
        </div>
      )}
    </PageContainer>
  )
}
