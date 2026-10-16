import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Banknote, CalendarCheck, CarFront, Gauge, KeyRound, Plus } from 'lucide-react'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { RecordTable } from '@/components/data-display/RecordTable'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { usePermissions } from '@/components/feedback/Can'
import { useFormatters } from '@/i18n'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { cn } from '@/lib/utils'
import type { BookingListSort, BookingListTab } from '@/modules/bookings/api/booking.mapper'
import { NO_BOOKING_FILTERS } from '@/modules/bookings/constants/booking.constants'
import { useBookingDaily, useBookingPage, useBookingStats } from '@/modules/bookings/hooks/use-bookings'
import type { BookingFilters, BookingStats } from '@/modules/bookings/types/booking.types'
import { LIST_ICON, type ListKey } from '@/modules/dashboard/constants/dashboard.constants'
import { bookingColumns, bookingRow, withVehicleImage } from '@/modules/bookings/utils/booking.utils'
import {
  bookingTrends,
  compare,
  dayPart,
  daySummary,
  firstName,
  isFlat,
  monthRevenue,
  recentRevenue,
  revenueWindow,
  roundedPercent,
  runningTotals,
  sparkPoints,
  trendWindow,
  type Comparison,
} from '@/modules/dashboard/utils/dashboard.utils'
import {
  FleetStatusCard,
  KpiCard,
  OpsRow,
  RevenueBars,
  useDashboardRefresh,
  type KpiDef,
  type OpDef,
} from '@/modules/dashboard'
import { useLocations } from '@/modules/locations/hooks/use-locations'
import { useCollectedByDay } from '@/modules/payments/hooks/use-payments'
import { useVehicleStats, useVehicleThumbnails } from '@/modules/vehicles/hooks/use-vehicles'
import { useMe } from '@/services/auth/use-me'
import { companyDay, companyWall } from '@/utils/company-time'
import { parseDay } from '@/utils/dates'
import { hasPermission } from '@/utils/permissions'

const LISTS: Record<ListKey, { tab: BookingListTab; sort: BookingListSort; filters: BookingFilters }> = {
  pickups: { tab: 'Today', sort: 'pickupAsc', filters: NO_BOOKING_FILTERS },
  returns: { tab: 'Returning', sort: 'returnAsc', filters: NO_BOOKING_FILTERS },
  // Longest overdue first: the car that has been out the longest is the one to chase.
  overdue: { tab: 'Overdue', sort: 'returnAsc', filters: NO_BOOKING_FILTERS },
  requests: { tab: 'All', sort: 'pickupAsc', filters: { ...NO_BOOKING_FILTERS, status: 'Pending' } },
  missed: { tab: 'Missed', sort: 'pickupAsc', filters: NO_BOOKING_FILTERS },
  notReady: { tab: 'NotReady', sort: 'pickupAsc', filters: NO_BOOKING_FILTERS },
}

// Today's three are always offered; the to-do lists only while they hold something.
const ALWAYS_LISTED: ListKey[] = ['pickups', 'returns', 'overdue']

function listCounts(stats: BookingStats): Record<ListKey, number> {
  return {
    pickups: stats.tabCounts.Today,
    returns: stats.returningToday,
    overdue: stats.tabCounts.Overdue,
    requests: stats.pending,
    missed: stats.missedPickups,
    notReady: stats.notReadySoon,
  }
}

const LIST_ID = 'dashboard-bookings'

// The whole fleet, as the vehicles page's own cards read it, so the two share a cached answer.
const WHOLE_FLEET = { page: 1, pageSize: DEFAULT_PAGE_SIZE }

export function DashboardPage() {
  const { t } = useTranslation('dashboard')
  const { t: tBookings } = useTranslation('bookings')
  const format = useFormatters()
  const navigate = useNavigate()
  const canAddVehicles = hasPermission(usePermissions(), 'vehicles.create')
  const now = useDashboardRefresh()

  const [list, setList] = useState<ListKey>('pickups')
  const [page, setPage] = useState(1)

  const today = companyDay(now)
  const revenueDays = revenueWindow(today)
  const name = firstName(useMe().data?.user.fullName ?? '')
  const bookingStats = useBookingStats()
  const vehicleStats = useVehicleStats(WHOLE_FLEET)
  const collected = useCollectedByDay(revenueDays.from, revenueDays.to)
  const trendDays = trendWindow(today)
  const daily = useBookingDaily(trendDays.from, trendDays.to)
  const locations = useLocations().data?.length
  const thumbnails = useVehicleThumbnails()
  const bookingsPage = useBookingPage({ ...LISTS[list], page, pageSize: DEFAULT_PAGE_SIZE })

  const bookings = bookingStats.data
  const fleet = vehicleStats.data
  const counts = bookings && listCounts(bookings)

  const showList = (key: ListKey) => {
    setList(key)
    setPage(1)
    document.getElementById(LIST_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const pickupsLeft = bookings && Math.max(0, bookings.tabCounts.Today - bookings.pickedUpToday)

  const ops: OpDef[] = [
    { key: 'pickups', count: pickupsLeft, onClick: () => showList('pickups') },
    { key: 'returns', count: counts?.returns, onClick: () => showList('returns') },
    { key: 'overdue', count: counts?.overdue, onClick: () => showList('overdue') },
    { key: 'requests', count: counts?.requests, onClick: () => showList('requests') },
  ]

  const thisMonth = parseDay(today)
  const lastMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1)
  const month = collected.data && monthRevenue(collected.data, today)
  const monthSoFar = month && runningTotals(month.days)
  const wall = companyWall(now)
  // How much of today has gone by, which weighs its partial utilization against whole days.
  const dayFraction = (wall.getUTCHours() * 3600 + wall.getUTCMinutes() * 60 + wall.getUTCSeconds()) / 86_400
  const trends = daily.data && bookingTrends(daily.data, dayFraction)

  const dash = '—'
  // Said, rather than left as a dash beside a note that reads like a real figure.
  const unavailable = t('kpi.unavailable')
  // Whole units on a headline: the cents are on the Payments page.
  const money = (amount: number) => format.currency(Math.round(amount))
  const signed = (text: string, value: number) => (value > 0 ? `+${text}` : value < 0 ? `−${text}` : text)
  // A percentage where there was something to compare with, else the plain difference.
  const badge = (change: Comparison, difference: string): KpiDef['badge'] => ({
    tone: change.tone,
    text:
      change.percent === undefined
        ? signed(difference, change.difference)
        : `${format.number(Math.abs(roundedPercent(change.percent)))}%`,
  })

  const revenue = month && compare(month.total, month.lastMonthToDate)
  const bookingsMade = trends && compare(trends.bookings.current, trends.bookings.previous)
  const used = trends && compare(trends.utilization.current, trends.utilization.previous)
  const kpis: KpiDef[] = [
    {
      id: 'revenue',
      icon: Banknote,
      label: t('kpi.revenueMtd'),
      value: month ? money(month.total) : dash,
      badge: revenue && badge(revenue, money(Math.abs(revenue.difference))),
      note: collected.isError
        ? unavailable
        : t('kpi.vsMonth', { month: format.date(lastMonth, { month: 'short' }) }),
      spark: monthSoFar && sparkPoints(monthSoFar),
      sparkFlat: monthSoFar && isFlat(monthSoFar),
    },
    {
      id: 'activeRentals',
      icon: KeyRound,
      label: t('kpi.activeRentals'),
      value: trends ? format.number(trends.activeRentals.current) : dash,
      badge: trends &&
        bookings && {
          text: format.number(bookings.pickedUpToday),
          tone: bookings.pickedUpToday > 0 ? 'up' : 'neutral',
          // A count of cars leaving, not a trend: the pickup card's own arrow.
          icon: LIST_ICON.pickups,
        },
      note: daily.isError ? unavailable : t('kpi.outToday'),
      spark: trends && sparkPoints(trends.activeRentals.spark),
      sparkFlat: trends && isFlat(trends.activeRentals.spark),
    },
    {
      id: 'utilization',
      icon: Gauge,
      label: t('kpi.utilization'),
      value: trends ? format.percent(Math.round(trends.utilization.current * 100)) : dash,
      // Points, not percent: 10% to 13% is 3 points, which "30%" would misstate.
      badge: used && {
        tone: used.tone,
        text: t('kpi.points', { value: format.number(Math.abs(roundedPercent(used.difference * 100))) }),
      },
      note: daily.isError ? unavailable : t('kpi.vsLastWeek'),
      spark: trends && sparkPoints(trends.utilization.spark),
      sparkFlat: trends && isFlat(trends.utilization.spark),
    },
    {
      id: 'bookings7d',
      icon: CalendarCheck,
      label: t('kpi.bookings7d'),
      value: trends ? format.number(trends.bookings.current) : dash,
      badge: bookingsMade && badge(bookingsMade, format.number(Math.abs(bookingsMade.difference))),
      note: daily.isError ? unavailable : t('kpi.vsPriorWeek'),
      spark: trends && sparkPoints(trends.bookings.spark),
      sparkFlat: trends && isFlat(trends.bookings.spark),
    },
  ]
  const failed = [bookingStats, vehicleStats].filter((query) => query.isError)
  // A company with no cars and no bookings yet has nothing to count: show where to start instead.
  const isNewCompany = fleet?.total === 0 && bookings?.tabCounts.All === 0

  const rows = (bookingsPage.data?.items ?? []).map((b) =>
    bookingRow(withVehicleImage(b, thumbnails), [
      { label: tBookings('list.rowActions.viewDetails'), onClick: () => navigate(`/bookings/${b[1]}`) },
    ]),
  )
  const listed = (Object.keys(LISTS) as ListKey[]).filter(
    (key) => ALWAYS_LISTED.includes(key) || key === list || (counts?.[key] ?? 0) > 0,
  )

  const part = dayPart(wall.getUTCHours())
  // An instant, not a Date: the formatter then shows the company's day, not this browser's.
  const date = format.date(new Date(now).toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })
  const summary = bookings
    ? t(`summary.${daySummary(pickupsLeft ?? 0, counts?.returns ?? 0)}`, {
        pickups: t('summary.pickups', { count: pickupsLeft }),
        returns: t('summary.returns', { count: counts?.returns }),
      })
    : undefined

  return (
    <PageContainer>
      <PageHeader
        title={name ? t(`greeting.${part}`, { name }) : t(`greetingAnonymous.${part}`)}
        description={summary ? `${date} · ${summary}` : date}
        actions={
          <PageActionButton
            icon={Plus}
            label={t('newBooking')}
            variant="solid"
            onClick={() => navigate('/bookings/new')}
          />
        }
      />

      {failed.length > 0 ? (
        <ErrorState onRetry={() => failed.forEach((query) => void query.refetch())} />
      ) : isNewCompany ? (
        <EmptyState
          icon={CarFront}
          title={t('empty.title')}
          description={t('empty.description')}
          action={
            canAddVehicles ? (
              <PageActionButton
                icon={Plus}
                label={t('empty.addVehicle')}
                variant="solid"
                onClick={() => navigate('/vehicles/new')}
              />
            ) : undefined
          }
        />
      ) : (
        <>
          <div
            className="grid gap-3.5"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}
          >
            {kpis.map((kpi) => (
              <KpiCard key={kpi.id} {...kpi} />
            ))}
          </div>

          <OpsRow ops={ops} />

          <div className="flex flex-wrap items-stretch gap-4">
            <RevenueBars
              recent={collected.data && recentRevenue(collected.data, today)}
              isError={collected.isError}
              onRetry={() => void collected.refetch()}
            />
            <FleetStatusCard stats={fleet} locations={locations} />
          </div>

          {/* Dimmed while the next tab loads: the rows on screen still belong to the last one. */}
          <div
            id={LIST_ID}
            className={cn(
              'scroll-mt-4 transition-opacity',
              bookingsPage.isStale && 'pointer-events-none opacity-60',
            )}
            aria-busy={bookingsPage.isStale}
          >
            <RecordTable
              title={t('list.title')}
              tabs={listed.map((key) => ({
                key,
                label: t(`list.tabs.${key}`),
                count: counts?.[key],
                selected: list === key,
                onClick: () => {
                  setList(key)
                  setPage(1)
                },
              }))}
              columns={bookingColumns(tBookings)}
              rows={rows}
              pagination={
                bookingsPage.data
                  ? {
                      page: bookingsPage.data.page,
                      pageSize: DEFAULT_PAGE_SIZE,
                      total: bookingsPage.data.total,
                      onPageChange: setPage,
                    }
                  : undefined
              }
              minWidth="800px"
              onRowClick={(key) => navigate(`/bookings/${key}`)}
              emptyState={
                bookingsPage.isError ? (
                  <ErrorState className="border-0 py-10" onRetry={() => void bookingsPage.refetch()} />
                ) : bookingsPage.data ? (
                  <EmptyState
                    className="border-0 py-10"
                    icon={LIST_ICON[list]}
                    title={t(`list.empty.${list}.title`)}
                    description={t(`list.empty.${list}.description`)}
                  />
                ) : (
                  <LoadingState className="py-10" hideLabel />
                )
              }
            />
          </div>
        </>
      )}
    </PageContainer>
  )
}
