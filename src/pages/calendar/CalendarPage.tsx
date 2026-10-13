import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Car, List, Plus, SearchX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { FilterBar } from '@/components/data-display/FilterBar'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { useFormatters } from '@/i18n'
import { weekStartsOn } from '@/i18n/languages'
import { useNow } from '@/lib/use-now'
import { BookingCalendarLegend } from '@/modules/bookings/components/BookingCalendarLegend'
import { BookingCalendarTimeline } from '@/modules/bookings/components/BookingCalendarTimeline'
import { BookingCalendarToolbar } from '@/modules/bookings/components/BookingCalendarToolbar'
import { BookingCalendarYear } from '@/modules/bookings/components/BookingCalendarYear'
import { CALENDAR_HIDDEN_BY_DEFAULT } from '@/modules/bookings/constants/booking.constants'
import { useBookingCalendar } from '@/modules/bookings/hooks/use-bookings'
import type { CalendarStatus, CalendarView } from '@/modules/bookings/types/booking-calendar.types'
import {
  bookedVehiclesByDay,
  calendarColumns,
  calendarRange,
  calendarRows,
  calendarTitle,
  filterCalendar,
  parseCalendarDay,
  parseCalendarView,
  shiftAnchor,
  toCalendarVehicle,
  yearMonths,
} from '@/modules/bookings/utils/booking.calendar'
import { useLocationNames } from '@/modules/locations/hooks/use-locations'
import { useWholeFleet } from '@/modules/vehicles/hooks/use-vehicles'
import { companyLocal, instantOfCompanyLocal } from '@/utils/company-time'
import { formatDay } from '@/utils/dates'

const HIDDEN_BY_DEFAULT: ReadonlySet<CalendarStatus> = new Set(CALENDAR_HIDDEN_BY_DEFAULT)

export function CalendarPage() {
  const { t } = useTranslation('bookings')
  const { t: tCommon } = useTranslation('common')
  const format = useFormatters()
  const navigate = useNavigate()
  const now = useNow()
  const { names: locationNames } = useLocationNames()

  // In the address bar, so a view can be linked to and survives a reload.
  const [params, setParams] = useSearchParams()
  const view = parseCalendarView(params.get('view'))
  const day = params.get('date')
  const anchor = useMemo(() => parseCalendarDay(day, companyLocal(new Date())), [day])
  // Where the grid marks the present: the company's time of day, not this browser's.
  const gridNow = companyLocal(now).getTime()

  // Typed into its own state: the address bar updates in a transition, which would drop keystrokes.
  const [search, setSearch] = useState(() => params.get('q') ?? '')
  const [location, setLocation] = useState<string>('All')
  const [hidden, setHidden] = useState(HIDDEN_BY_DEFAULT)

  const weekStart = weekStartsOn(format.language)
  const range = useMemo(() => calendarRange(view, anchor, weekStart), [view, anchor, weekStart])
  const columns = useMemo(() => (view === 'year' ? [] : calendarColumns(view, range)), [view, range])

  // The grid's dates stand for the company's clock, so the stretch asked for is the company's too.
  const bookings = useBookingCalendar(instantOfCompanyLocal(range.from), instantOfCompanyLocal(range.to))
  const fleet = useWholeFleet()
  const vehicles = useMemo(() => (fleet.data ?? []).map(toCalendarVehicle), [fleet.data])

  // The year has no legend to switch statuses back on with, so it counts what is shown by default.
  const hiddenInView = view === 'year' ? HIDDEN_BY_DEFAULT : hidden
  const shown = useMemo(
    () => filterCalendar(vehicles, bookings.data ?? [], { search, location, hidden: hiddenInView }, now),
    [vehicles, bookings.data, search, location, hiddenInView, now],
  )
  const rows = useMemo(
    () => (view === 'year' ? [] : calendarRows(shown.vehicles, shown.bookings, columns, now)),
    [view, shown, columns, now],
  )
  const booked = useMemo(
    () => (view === 'year' ? bookedVehiclesByDay(shown.bookings, range) : new Map<string, number>()),
    [view, shown, range],
  )
  const months = useMemo(
    () => (view === 'year' ? yearMonths(range.from, weekStart) : []),
    [view, range, weekStart],
  )

  /** Replaces the entry: stepping through a year of weeks should not bury the page before it. */
  function show(next: { view?: CalendarView; date?: Date; search?: string }) {
    setParams(
      (current) => {
        const updated = new URLSearchParams(current)
        if (next.view) updated.set('view', next.view)
        if (next.date) updated.set('date', formatDay(next.date))
        if (next.search !== undefined) {
          if (next.search) updated.set('q', next.search)
          else updated.delete('q')
        }
        return updated
      },
      { replace: true },
    )
  }

  function toggleStatus(status: CalendarStatus) {
    setHidden((current) => {
      const updated = new Set(current)
      if (!updated.delete(status)) updated.add(status)
      return updated
    })
  }

  const loading = bookings.isLoading || fleet.isLoading
  const failed = bookings.isError || fleet.isError
  const narrowed = Boolean(search.trim()) || location !== 'All'

  return (
    <PageContainer>
      <PageHeader
        title={t('calendar.title')}
        description={t('calendar.description')}
        actions={
          <>
            <PageActionButton
              icon={List}
              label={t('calendar.listView')}
              onClick={() => navigate('/bookings')}
            />
            <PageActionButton
              icon={Plus}
              label={t('list.newBooking')}
              variant="solid"
              onClick={() => navigate('/bookings/new')}
            />
          </>
        }
      />

      <Tabs
        value={view}
        onValueChange={(value) => show({ view: value as CalendarView })}
        className="flex flex-col gap-4"
      >
        <BookingCalendarToolbar
          view={view}
          title={calendarTitle(view, range, format.locale)}
          onStep={(steps) => show({ date: shiftAnchor(view, anchor, steps) })}
          onToday={() => show({ date: companyLocal(new Date()) })}
        />

        <FilterBar
          searchPlaceholder={t('calendar.searchPlaceholder')}
          searchValue={search}
          onSearchChange={(value) => {
            setSearch(value)
            show({ search: value })
          }}
          filters={[
            {
              label: t('filters.location'),
              value:
                location === 'All' ? tCommon('filters.allCount', { count: locationNames.length }) : location,
              options: [
                { value: 'All', label: tCommon('filters.all') },
                ...locationNames.map((name) => ({ value: name, label: name })),
              ],
              onChange: setLocation,
            },
          ]}
        />

        <TabsContent value={view} className="mt-0">
          {loading ? (
            <LoadingState label={t('calendar.loading')} />
          ) : failed ? (
            <ErrorState
              description={t('calendar.loadError')}
              onRetry={() => {
                void bookings.refetch()
                void fleet.refetch()
              }}
            />
          ) : view !== 'year' && rows.length === 0 ? (
            narrowed ? (
              <EmptyState
                icon={SearchX}
                title={t('calendar.noMatches.title')}
                description={t('calendar.noMatches.description')}
              />
            ) : (
              <EmptyState
                icon={Car}
                title={t('calendar.noVehicles.title')}
                description={t('calendar.noVehicles.description')}
                action={
                  <Button variant="outline" onClick={() => navigate('/vehicles/new')}>
                    {t('calendar.noVehicles.action')}
                  </Button>
                }
              />
            )
          ) : (
            // Dimmed while the next window loads: its rentals are still arriving.
            <Card
              className={cn('transition-opacity', bookings.isStale && 'opacity-60')}
              aria-busy={bookings.isStale}
            >
              {view === 'year' ? (
                <BookingCalendarYear
                  months={months}
                  booked={booked}
                  fleetSize={shown.vehicles.length}
                  now={gridNow}
                  onOpenDay={(date) => show({ view: 'day', date })}
                  onOpenMonth={(date) => show({ view: 'month', date })}
                />
              ) : (
                <>
                  <BookingCalendarTimeline
                    view={view}
                    columns={columns}
                    rows={rows}
                    now={gridNow}
                    onOpenDay={(date) => show({ view: 'day', date })}
                  />
                  <BookingCalendarLegend
                    hidden={hidden}
                    onToggle={toggleStatus}
                    count={rows.reduce((total, row) => total + row.bars.length, 0)}
                  />
                </>
              )}
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
