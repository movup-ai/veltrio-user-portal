import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Banknote, CalendarCheck, CalendarDays, CalendarX2, Download, Plus, TriangleAlert } from 'lucide-react'
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
import { MOCK_BRANCHES } from '@/modules/locations/mock/location.mock'
import { useBookings } from '@/modules/bookings/hooks/use-bookings'
import {
  BOOKING_ATTENTION_STATUSES,
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
  EMPTY_BOOKING_LISTS,
  MOCK_TODAY,
  allBookings,
  bookingMakes,
  bookingPickupOrdinal,
  bookingsForTab,
  filterBookings,
  sortBookings,
} from '@/modules/bookings/utils/booking.filters'
import { bookingColumns, bookingRow, downloadBookingsCsv, parseBookingTotal } from '@/modules/bookings/utils/booking.utils'

/** Pickups no further out than this count towards the "starting soon" note on the Open bookings stat. */
const STARTING_SOON_DAYS = 2

export function BookingsPage() {
  const { t } = useTranslation('bookings')
  const { t: tCommon } = useTranslation('common')
  const domain = useDomainLabels()
  const format = useFormatters()
  const navigate = useNavigate()

  const [tab, setTab] = useState<BookingTab>('Upcoming')
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


  const filters: BookingFilters = useMemo(
    () => ({
      search,
      status: statusFilter,
      location: locationFilter,
      pickup: pickupFilter,
      make: makeFilter,
      durationBand: durationFilter,
      valueBands,
    }),
    [search, statusFilter, locationFilter, pickupFilter, makeFilter, durationFilter, valueBands],
  )

  const { data, isLoading, isError, refetch } = useBookings()
  const lists = data ?? EMPTY_BOOKING_LISTS

  const tabTotal = bookingsForTab(tab, lists).length
  const rowsData = useMemo(
    () => sortBookings(filterBookings(bookingsForTab(tab, lists), filters), sort),
    [tab, lists, filters, sort],
  )

  // Each tab's count is what it would actually reveal under the current filters — the tab itself
  // is the only constraint that varies, so every tab is recounted against the same filter set.
  const tabCounts = useMemo(
    () =>
      Object.fromEntries(
        BOOKING_TABS.map((value) => [value, filterBookings(bookingsForTab(value, lists), filters).length]),
      ) as Record<BookingTab, number>,
    [lists, filters],
  )

  const makes = useMemo(() => bookingMakes(allBookings(lists)), [lists])

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
    const activeCount = (draftMake !== 'All' ? 1 : 0) + (draftDuration !== 'Any' ? 1 : 0) + (draftValueBands.length > 0 ? 1 : 0)
    toast({
      title: tCommon('filters.applied'),
      description: activeCount > 0 ? tCommon('filters.appliedCount', { count: activeCount }) : tCommon('filters.appliedNone'),
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
      prev.includes(value as BookingValueBand) ? prev.filter((v) => v !== value) : [...prev, value as BookingValueBand],
    )
  }

  // Stats describe the whole book of business, not the current filters — same contract as the fleet stats on Vehicles.
  const openBookings = lists.upcoming
  const startingSoon = openBookings.filter((b) => bookingPickupOrdinal(b) - MOCK_TODAY <= STARTING_SOON_DAYS).length
  const bookedValue = openBookings
    .filter((b) => b[7] === 'Confirmed')
    .reduce((sum, b) => sum + parseBookingTotal(b[8]), 0)
  const needsAttention = allBookings(lists).filter((b) => BOOKING_ATTENTION_STATUSES.includes(b[7]))
  const awaitingId = needsAttention.filter((b) => b[7] === 'Awaiting ID').length
  const depositDue = needsAttention.filter((b) => b[7] === 'Deposit due').length

  const stats = [
    {
      icon: CalendarCheck,
      label: t('list.stats.open'),
      value: String(openBookings.length),
      note: t('list.stats.openNote', { count: startingSoon }),
    },
    {
      icon: Banknote,
      label: t('list.stats.expectedRevenue'),
      value: format.currency(bookedValue),
      note: t('list.stats.expectedRevenueNote'),
    },
    {
      icon: TriangleAlert,
      label: t('list.stats.needsAttention'),
      value: String(needsAttention.length),
      note: t('list.stats.needsAttentionNote', { awaitingId, depositDue }),
    },
  ]

  function handleExport(bookings: BookingTuple[]) {
    downloadBookingsCsv(bookings, 'bookings.csv', t)
  }

  const rows = rowsData.map((b) =>
    bookingRow(b, [
      { label: t('list.rowActions.viewDetails'), onClick: () => navigate(`/app/bookings/${b[1]}`) },
      { label: t('list.rowActions.editBooking'), onClick: () => navigate(`/app/bookings/${b[1]}`) },
      { label: t('list.rowActions.exportBooking'), onClick: () => handleExport([b]) },
    ]),
  )

  return (
    <PageContainer>
      <PageHeader
        title={t('list.title')}
        description={t('list.description')}
        actions={
          <>
            <PageActionButton icon={CalendarDays} label={t('list.calendarView')} />
            <PageActionButton icon={Download} label={t('list.export')} onClick={() => handleExport(rowsData)} />
            <PageActionButton
              icon={Plus}
              label={t('list.newBooking')}
              variant="solid"
              onClick={() => navigate('/app/bookings/new')}
            />
          </>
        }
      />

      <StatStrip stats={stats} />

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
            value: locationFilter === 'All' ? tCommon('filters.allCount', { count: MOCK_BRANCHES.length }) : locationFilter,
            options: [
              { value: 'All', label: tCommon('filters.all') },
              ...MOCK_BRANCHES.map((l) => ({ value: l.name, label: l.name })),
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
            options: [{ value: 'All', label: tCommon('filters.all') }, ...makes.map((m) => ({ value: m, label: m }))],
            onChange: setDraftMake,
          },
          {
            kind: 'select',
            label: t('filters.duration'),
            value: draftDuration === 'Any' ? tCommon('filters.any') : t(`filters.durationBand.${draftDuration}`),
            options: [
              { value: 'Any', label: tCommon('filters.any') },
              ...BOOKING_DURATION_BANDS.map((d) => ({ value: d.value, label: t(`filters.durationBand.${d.value}`) })),
            ],
            onChange: (value) => setDraftDuration(value as BookingDurationBand | 'Any'),
          },
          {
            kind: 'checkboxGroup',
            label: t('filters.bookingValue'),
            options: BOOKING_VALUE_BANDS.map((v) => ({ value: v.value, label: t(`filters.valueBand.${v.value}`) })),
            selected: draftValueBands,
            onToggle: toggleDraftValueBand,
          },
        ]}
        moreFiltersActiveCount={moreFiltersActiveCount}
        onClearMoreFilters={handleClearMoreFilters}
        onApplyFilters={handleApplyFilters}
        onOpenMoreFilters={handleOpenMoreFilters}
      />

      {isLoading && !data ? (
        <LoadingState label={t('list.loading')} />
      ) : isError ? (
        <ErrorState description={t('list.loadError')} onRetry={() => refetch()} />
      ) : (
        // Rendered even with no rows so the tabs stay reachable — otherwise selecting an empty
        // tab would unmount the only way back to a non-empty one.
        <RecordTable
          tabs={BOOKING_TABS.map((value) => ({
            key: value,
            label: t(`list.tabs.${value}`),
            count: tabCounts[value],
            selected: tab === value,
            onClick: () => setTab(value),
          }))}
          columns={bookingColumns(t)}
          rows={rows}
          actions={
            <SortSelect
              label={t('list.sort.label')}
              value={sort}
              options={BOOKING_SORTS.map((value) => ({ value, label: t(`list.sort.${value}`) }))}
              onChange={(value) => setSort(value as BookingSort)}
            />
          }
          pageNote={rows.length > 0 ? t('list.pageNote', { shown: rows.length, total: tabTotal }) : t('list.noneFound')}
          minWidth="800px"
          onRowClick={(reference) => navigate(`/app/bookings/${reference}`)}
          emptyState={<EmptyState icon={CalendarX2} title={t('list.emptyTitle')} description={t('list.emptyDescription')} />}
        />
      )}
    </PageContainer>
  )
}
