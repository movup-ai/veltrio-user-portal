import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarCheck, CalendarDays, Download, Banknote, Plus, TriangleAlert } from 'lucide-react'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { FilterBar } from '@/components/data-display/FilterBar'
import { RecordTable } from '@/components/data-display/RecordTable'
import { StatStrip } from '@/components/data-display/StatStrip'
import { usePageHeaderActions } from '@/components/navigation/usePageHeaderActions'
import { useFormatters } from '@/i18n'
import { BOOKINGS_RECENT, BOOKINGS_UPCOMING } from '@/modules/bookings/mock/booking.mock'
import { bookingColumns, bookingRow } from '@/modules/bookings/utils/booking.utils'

const TABS = ['Upcoming', 'Today', 'Recent activity', 'Overdue'] as const
type Tab = (typeof TABS)[number]

const TOTAL_BOOKINGS = 34

export function BookingsPage() {
  const { t } = useTranslation('bookings')
  const { t: tCommon } = useTranslation('common')
  const format = useFormatters()
  const [tab, setTab] = useState<Tab>('Upcoming')

  usePageHeaderActions([{ label: t('list.newBooking'), icon: Plus }], [t])

  const rows = (tab === 'Recent activity' ? BOOKINGS_RECENT : BOOKINGS_UPCOMING).map(bookingRow)

  return (
    <PageContainer>
      <PageHeader
        title={t('list.title')}
        description={t('list.description')}
        actions={
          <>
            <PageActionButton icon={CalendarDays} label={t('list.calendarView')} />
            <PageActionButton icon={Download} label={t('list.export')} />
          </>
        }
      />

      <FilterBar
        searchPlaceholder={t('list.searchPlaceholder')}
        filters={[
          { label: t('list.filters.status'), value: tCommon('filters.any') },
          { label: t('list.filters.location'), value: tCommon('filters.allCount', { count: 3 }) },
          { label: t('list.filters.pickup'), value: 'Sep 14 – Sep 21' },
        ]}
      />

      <StatStrip
        stats={[
          { icon: CalendarCheck, label: t('list.stats.open'), value: '34', note: t('list.stats.openNote') },
          {
            icon: Banknote,
            label: t('list.stats.bookedValue'),
            value: format.currency(28940),
            note: t('list.stats.bookedValueNote'),
          },
          { icon: TriangleAlert, label: t('list.stats.needsAttention'), value: '3', note: t('list.stats.needsAttentionNote') },
        ]}
      />

      <RecordTable
        tabs={TABS.map((value) => ({
          key: value,
          label: t(`list.tabs.${value}`),
          selected: tab === value,
          onClick: () => setTab(value),
        }))}
        columns={bookingColumns(t)}
        rows={rows}
        rowCountLabel={tCommon('table.countOf', { count: rows.length, total: TOTAL_BOOKINGS })}
        pageNote={t('list.pageNote', { shown: rows.length, total: TOTAL_BOOKINGS })}
        minWidth="800px"
      />
    </PageContainer>
  )
}
