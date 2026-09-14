import { useState } from 'react'
import { CalendarCheck, CalendarDays, Download, Banknote, Plus, TriangleAlert } from 'lucide-react'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { FilterBar } from '@/components/data-display/FilterBar'
import { RecordTable } from '@/components/data-display/RecordTable'
import { StatStrip } from '@/components/data-display/StatStrip'
import { usePageHeaderActions } from '@/components/navigation/usePageHeaderActions'
import { BOOKINGS_RECENT, BOOKINGS_UPCOMING } from '@/modules/bookings/mock/booking.mock'
import { bookingColumns, bookingRow } from '@/modules/bookings/utils/booking.utils'

const TABS = ['Upcoming', 'Today', 'Recent activity', 'Overdue'] as const
type Tab = (typeof TABS)[number]

export function BookingsPage() {
  const [tab, setTab] = useState<Tab>('Upcoming')
  usePageHeaderActions([{ label: 'New booking', icon: Plus }])

  const rows = (tab === 'Recent activity' ? BOOKINGS_RECENT : BOOKINGS_UPCOMING).map(bookingRow)

  return (
    <PageContainer>
      <PageHeader
        title="Bookings"
        description="Every reservation across your three locations"
        actions={
          <>
            <PageActionButton icon={CalendarDays} label="Calendar view" />
            <PageActionButton icon={Download} label="Export" />
          </>
        }
      />

      <FilterBar
        searchPlaceholder="Search reference, customer, plate"
        filters={[
          { label: 'Status', value: 'Any' },
          { label: 'Location', value: 'All 3' },
          { label: 'Pickup', value: 'Sep 14 – Sep 21' },
        ]}
      />

      <StatStrip
        stats={[
          { icon: CalendarCheck, label: 'Open bookings', value: '34', note: '12 start in the next 48h' },
          { icon: Banknote, label: 'Booked value', value: '$28,940', note: 'Confirmed, not yet invoiced' },
          { icon: TriangleAlert, label: 'Needs attention', value: '3', note: '2 awaiting ID · 1 deposit due' },
        ]}
      />

      <RecordTable
        tabs={TABS.map((t) => ({ label: t, selected: tab === t, onClick: () => setTab(t) }))}
        columns={bookingColumns()}
        rows={rows}
        rowCountLabel={`${rows.length} of 34`}
        pageNote={`Showing 1–${rows.length} of 34 bookings`}
        minWidth="800px"
      />
    </PageContainer>
  )
}
