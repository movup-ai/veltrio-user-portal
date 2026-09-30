import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Banknote,
  CalendarCheck,
  CalendarDays,
  CalendarX2,
  Download,
  FileEdit,
  Plus,
  TriangleAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { FilterBar } from '@/components/data-display/FilterBar'
import { RecordTable } from '@/components/data-display/RecordTable'
import { SortSelect } from '@/components/data-display/SortSelect'
import { StatStrip } from '@/components/data-display/StatStrip'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { toast } from '@/components/ui/use-toast'
import { EMPTY_DATE_RANGE, fromDateValue, type DateRange } from '@/components/ui/date-range-picker'
import { useFormatters } from '@/i18n'
import { useDomainLabels } from '@/i18n/domain'
import { useLocationNames } from '@/modules/locations/hooks/use-locations'
import {
  useBookingPage,
  useBookingStats,
  useBookingTabCounts,
} from '@/modules/bookings/hooks/use-bookings'
import { useBookingDrafts, useDeleteBookingDraft } from '@/modules/bookings/hooks/use-booking-drafts'
import {
  BOOKING_DURATION_BANDS,
  BOOKING_SORTS,
  BOOKING_STATUSES,
  BOOKING_TABS,
  BOOKING_VALUE_BANDS,
  type BookingDurationBand,
  type BookingFilters,
  type BookingSort,
  type BookingStatus,
  type BookingTab,
  type BookingTuple,
  type BookingValueBand,
} from '@/modules/bookings/types/booking.types'
import {
  bookingColumns,
  bookingRow,
  downloadBookingsCsv,
  draftColumns,
  draftRow,
  withVehicleImage,
} from '@/modules/bookings/utils/booking.utils'
import { useVehicleMakes, useVehicleThumbnails } from '@/modules/vehicles/hooks/use-vehicles'
import { resultSetKey } from '@/modules/bookings/utils/booking.paging'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { useDebounced } from '@/lib/use-debounced'
import { bookingApi, ExportTooLargeError } from '@/modules/bookings/api/booking.api'
import { normalizeApiError } from '@/services/api/errors'

/** The Drafts tab sits beside the booking tabs but draws from its own resource. */
const DRAFTS_TAB = 'Drafts'

/** Shown while the counts load, so the tabs render without flickering through zero. */
const EMPTY_TAB_COUNTS: Record<BookingTab, number> = {
  Upcoming: 0,
  Today: 0,
  'Recent activity': 0,
  Overdue: 0,
}

export function BookingsPage() {
  const { t } = useTranslation('bookings')
  const { t: tCommon } = useTranslation('common')
  const domain = useDomainLabels()
  const { names: locationNames } = useLocationNames()
  const format = useFormatters()
  const navigate = useNavigate()

  const [tab, setTab] = useState<BookingTab | typeof DRAFTS_TAB>('Upcoming')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'Any'>('Any')
  const [locationFilter, setLocationFilter] = useState<string>('All')
  const [pickupFilter, setPickupFilter] = useState<DateRange>(EMPTY_DATE_RANGE)
  const [sort, setSort] = useState<BookingSort>('newest')
  // Applied values actually filter the list; draft values are what the "More filters" popover
  // edits live — they only become "applied" when Apply filters is clicked.
  const [makeFilter, setMakeFilter] = useState<string>('All')
  const [durationFilter, setDurationFilter] = useState<BookingDurationBand | 'Any'>('Any')
  const [valueBands, setValueBands] = useState<BookingValueBand[]>([])
  const [draftMake, setDraftMake] = useState<string>('All')
  const [draftDuration, setDraftDuration] = useState<BookingDurationBand | 'Any'>('Any')
  const [draftValueBands, setDraftValueBands] = useState<BookingValueBand[]>([])

  // Typing must not fire a request per keystroke; everything else applies immediately.
  const debouncedSearch = useDebounced(search)

  const filters: BookingFilters = useMemo(
    () => ({
      search: debouncedSearch,
      status: statusFilter,
      location: locationFilter,
      pickup: pickupFilter,
      make: makeFilter,
      durationBand: durationFilter,
      valueBands,
    }),
    [
      debouncedSearch,
      statusFilter,
      locationFilter,
      pickupFilter,
      makeFilter,
      durationFilter,
      valueBands,
    ],
  )

  const showingDrafts = tab === DRAFTS_TAB
  // The booking tabs still need a value while Drafts is selected; their rows are not rendered.
  const bookingTab: BookingTab = showingDrafts ? 'Upcoming' : tab

  // Narrowing the list resets to page 1: page 4 of the old result is rarely page 4 of the new.
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const filterKey = resultSetKey(filters, bookingTab, sort, pageSize)
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
    isStale: rowsAreStale,
  } = useBookingPage({ filters, tab: bookingTab, sort, page, pageSize })
  const { data: stats } = useBookingStats()
  const { data: filteredCounts } = useBookingTabCounts(filters)
  const { data: draftPage } = useBookingDrafts()
  const thumbnails = useVehicleThumbnails()
  const deleteDraft = useDeleteBookingDraft()
  const drafts = draftPage?.items ?? []

  const rowsData = pageData?.items ?? []
  const tabCounts = filteredCounts ?? EMPTY_TAB_COUNTS

  // Makes come from the fleet, not the loaded page: a filter offering only what this page
  // happens to show would hide the rest of the book.
  const makes = useVehicleMakes()

  /** "Sep 10 – Sep 20", or the single day when both ends match. Falls back to the "any" placeholder. */
  const pickupLabel = (() => {
    const from = fromDateValue(pickupFilter.from)
    const to = fromDateValue(pickupFilter.to)
    if (!from && !to) return t('filters.pickupAny')
    const parts = [from, to].filter((d) => d != null).map((d) => format.shortDate(d))
    return parts[0] === parts[1] ? parts[0] : parts.join(' – ')
  })()

  const moreFiltersActiveCount =
    (makeFilter !== 'All' ? 1 : 0) + (durationFilter !== 'Any' ? 1 : 0) + (valueBands.length > 0 ? 1 : 0)

  /** Popover just opened — discard any unapplied edits from last time by reseeding drafts from what's applied. */
  function handleOpenMoreFilters() {
    setDraftMake(makeFilter)
    setDraftDuration(durationFilter)
    setDraftValueBands(valueBands)
  }

  function handleApplyFilters() {
    setMakeFilter(draftMake)
    setDurationFilter(draftDuration)
    setValueBands(draftValueBands)
    const activeCount =
      (draftMake !== 'All' ? 1 : 0) + (draftDuration !== 'Any' ? 1 : 0) + (draftValueBands.length > 0 ? 1 : 0)
    toast({
      title: tCommon('filters.applied'),
      description:
        activeCount > 0
          ? tCommon('filters.appliedCount', { count: activeCount })
          : tCommon('filters.appliedNone'),
      variant: 'success',
    })
  }

  function handleClearMoreFilters() {
    setMakeFilter('All')
    setDurationFilter('Any')
    setValueBands([])
    setDraftMake('All')
    setDraftDuration('Any')
    setDraftValueBands([])
  }

  function toggleDraftValueBand(value: string) {
    setDraftValueBands((prev) =>
      prev.includes(value as BookingValueBand)
        ? prev.filter((v) => v !== value)
        : [...prev, value as BookingValueBand],
    )
  }

  // Counted by the API over the whole book, not the loaded page — the cards describe the
  // business, not the current view, which is the same contract the fleet stats keep.
  const {
    openBookings = 0,
    startingSoon = 0,
    expectedRevenue = 0,
    needsAttention = 0,
    unpaid = 0,
    unsigned = 0,
  } = stats ?? {}

  const statCards = [
    {
      icon: CalendarCheck,
      label: t('list.stats.open'),
      value: String(openBookings),
      note: t('list.stats.openNote', { count: startingSoon }),
    },
    {
      icon: Banknote,
      label: t('list.stats.expectedRevenue'),
      value: format.currency(expectedRevenue),
      note: t('list.stats.expectedRevenueNote'),
    },
    {
      icon: TriangleAlert,
      label: t('list.stats.needsAttention'),
      value: String(needsAttention),
      note: t('list.stats.needsAttentionNote', { unpaid, unsigned }),
    },
  ]

  function handleExport(bookings: BookingTuple[]) {
    downloadBookingsCsv(bookings, 'bookings.csv', t)
  }

  /** Exports everything matching the filters, not just the page on screen. */
  async function handleExportAll() {
    try {
      handleExport(await bookingApi.exportAll({ filters, tab: bookingTab, sort }))
    } catch (error) {
      // Past the cap the export would be short without saying so, so it is refused and the
      // counter is told to narrow the filters instead.
      const tooLarge = error instanceof ExportTooLargeError
      toast({
        title: t('list.exportFailed'),
        description: tooLarge
          ? t('list.exportTooLarge', { total: error.total, limit: error.limit })
          : normalizeApiError(error).message,
        variant: 'error',
      })
    }
  }

  // The tuple carries the plate, not the car, so the cover shot is joined in here rather than
  // at map time — the bookings list and the fleet load independently.
  const rows = rowsData.map((b) =>
    bookingRow(withVehicleImage(b, thumbnails), [
      { label: t('list.rowActions.viewDetails'), onClick: () => navigate(`/app/bookings/${b[1]}`) },
      { label: t('list.rowActions.editBooking'), onClick: () => navigate(`/app/bookings/${b[1]}`) },
      { label: t('list.rowActions.exportBooking'), onClick: () => handleExport([b]) },
    ]),
  )

  const draftRows = drafts.map((draft) =>
    draftRow(
      draft,
      t,
      format.date(draft.updatedAt, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      [
        {
          label: t('list.drafts.resume'),
          onClick: () => navigate(`/app/bookings/new?draft=${draft.id}`),
        },
        { label: t('list.drafts.discard'), onClick: () => deleteDraft.mutate(draft.id) },
      ],
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
              icon={CalendarDays}
              label={t('list.calendarView')}
              onClick={() => navigate('/app/calendar')}
            />
            <PageActionButton
              icon={Download}
              label={t('list.export')}
              onClick={() => void handleExportAll()}
            />
            <PageActionButton
              icon={Plus}
              label={t('list.newBooking')}
              variant="solid"
              onClick={() => navigate('/app/bookings/new')}
            />
          </>
        }
      />

      <StatStrip stats={statCards} />

      <FilterBar
        searchPlaceholder={t('list.searchPlaceholder')}
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            label: t('filters.status'),
            value: statusFilter === 'Any' ? tCommon('filters.any') : domain.status(statusFilter),
            options: [
              { value: 'Any', label: tCommon('filters.any') },
              ...BOOKING_STATUSES.map((s) => ({ value: s, label: domain.status(s) })),
            ],
            onChange: (value) => setStatusFilter(value as BookingStatus | 'Any'),
          },
          {
            label: t('filters.location'),
            value:
              locationFilter === 'All'
                ? tCommon('filters.allCount', { count: locationNames.length })
                : locationFilter,
            options: [
              { value: 'All', label: tCommon('filters.all') },
              ...locationNames.map((name) => ({ value: name, label: name })),
            ],
            onChange: setLocationFilter,
          },
          {
            kind: 'dateRange',
            label: t('filters.pickup'),
            value: pickupLabel,
            range: pickupFilter,
            onChange: setPickupFilter,
          },
        ]}
        moreFilters={[
          {
            kind: 'select',
            label: t('filters.vehicleMake'),
            value: draftMake === 'All' ? tCommon('filters.all') : draftMake,
            options: [
              { value: 'All', label: tCommon('filters.all') },
              ...makes.map((m) => ({ value: m, label: m })),
            ],
            onChange: setDraftMake,
          },
          {
            kind: 'select',
            label: t('filters.duration'),
            value:
              draftDuration === 'Any' ? tCommon('filters.any') : t(`filters.durationBand.${draftDuration}`),
            options: [
              { value: 'Any', label: tCommon('filters.any') },
              ...BOOKING_DURATION_BANDS.map((d) => ({
                value: d.value,
                label: t(`filters.durationBand.${d.value}`),
              })),
            ],
            onChange: (value) => setDraftDuration(value as BookingDurationBand | 'Any'),
          },
          {
            kind: 'checkboxGroup',
            label: t('filters.bookingValue'),
            options: BOOKING_VALUE_BANDS.map((v) => ({
              value: v.value,
              label: t(`filters.valueBand.${v.value}`),
            })),
            selected: draftValueBands,
            onToggle: toggleDraftValueBand,
          },
        ]}
        moreFiltersActiveCount={moreFiltersActiveCount}
        onClearMoreFilters={handleClearMoreFilters}
        onApplyFilters={handleApplyFilters}
        onOpenMoreFilters={handleOpenMoreFilters}
      />

      {isLoading && !pageData ? (
        <LoadingState label={t('list.loading')} />
      ) : isError ? (
        <ErrorState description={t('list.loadError')} onRetry={() => refetch()} />
      ) : (
        // Rendered even with no rows so the tabs stay reachable — otherwise selecting an empty
        // tab would unmount the only way back to a non-empty one. Dimmed while the next page
        // loads: the rows on screen belong to the previous filters until it arrives.
        <div
          className={cn('transition-opacity', rowsAreStale && 'pointer-events-none opacity-60')}
          aria-busy={rowsAreStale}
        >
        <RecordTable
          tabs={[
            ...BOOKING_TABS.map((value) => ({
              key: value,
              label: t(`list.tabs.${value}`),
              count: tabCounts[value],
              selected: tab === value,
              onClick: () => setTab(value),
            })),
            {
              key: DRAFTS_TAB,
              label: t('list.tabs.Drafts'),
              count: drafts.length,
              selected: tab === DRAFTS_TAB,
              onClick: () => setTab(DRAFTS_TAB),
            },
          ]}
          columns={showingDrafts ? draftColumns(t) : bookingColumns(t)}
          rows={showingDrafts ? draftRows : rows}
          actions={
            // Drafts are not sortable: they are ordered by what was touched last, which is
            // the only order a half-finished form has.
            showingDrafts ? undefined : (
              <SortSelect
                label={t('list.sort.label')}
                value={sort}
                options={BOOKING_SORTS.map((value) => ({ value, label: t(`list.sort.${value}`) }))}
                onChange={(value) => setSort(value as BookingSort)}
              />
            )
          }
          pageNote={
            showingDrafts
              ? t('list.draftsNote', { count: drafts.length })
              : rows.length === 0
                ? t('list.noneFound')
                : undefined
          }
          pagination={
            // Drafts are capped well under one page, so they never paginate.
            !showingDrafts && pageData
              ? {
                  page: pageData.page,
                  pageSize,
                  total: pageData.total,
                  onPageChange: setPage,
                  onPageSizeChange: setPageSize,
                }
              : undefined
          }
          minWidth="800px"
          onRowClick={(key) =>
            showingDrafts ? navigate(`/app/bookings/new?draft=${key}`) : navigate(`/app/bookings/${key}`)
          }
          emptyState={
            showingDrafts ? (
              <EmptyState
                icon={FileEdit}
                title={t('list.draftsEmptyTitle')}
                description={t('list.draftsEmptyDescription')}
              />
            ) : (
              <EmptyState
                icon={CalendarX2}
                title={t('list.emptyTitle')}
                description={t('list.emptyDescription')}
              />
            )
          }
        />
        </div>
      )}
    </PageContainer>
  )
}
