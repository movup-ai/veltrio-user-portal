import { useState } from 'react'
import { Banknote, CalendarCheck, Download, Gauge, KeyRound, Plus } from 'lucide-react'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { RecordTable } from '@/components/data-display/RecordTable'
import { usePageHeaderActions } from '@/components/navigation/usePageHeaderActions'
import { BOOKINGS_RECENT, BOOKINGS_UPCOMING } from '@/modules/bookings/mock/booking.mock'
import { bookingColumns, bookingRow } from '@/modules/bookings/utils/booking.utils'
import { FleetStatusCard, KpiCard, KPIS, OpsRow, RevenueBars } from '@/modules/dashboard'

const KPI_ICONS = [Banknote, KeyRound, Gauge, CalendarCheck]
const RANGES = ['7d', '30d', '90d'] as const

export function DashboardPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]>('30d')
  const [tab, setTab] = useState<'Upcoming' | 'Recent activity'>('Upcoming')

  usePageHeaderActions([{ label: 'New booking', icon: Plus }])

  const rows = (tab === 'Upcoming' ? BOOKINGS_UPCOMING : BOOKINGS_RECENT).map(bookingRow)

  return (
    <PageContainer>
      <PageHeader
        title="Good morning, Diego"
        description="Monday, 14 September · 6 pickups and 4 returns scheduled today"
        actions={
          <>
            <div className="bg-surface border-border flex overflow-hidden rounded-[9px] border">
              {RANGES.map((r, i) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className="hover:bg-surface-3 px-[13px] py-[7px] text-[12.5px] transition-colors"
                  style={{
                    borderLeft: i === 0 ? 'none' : '1px solid var(--color-border)',
                    background: range === r ? 'var(--color-surface-3)' : 'var(--color-surface)',
                    color: range === r ? 'var(--color-foreground)' : 'var(--color-fg-3)',
                    fontWeight: range === r ? 600 : 500,
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
            <PageActionButton icon={Download} label="Export" />
          </>
        }
      />

      <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        {KPIS.map((k, i) => (
          <KpiCard key={k.label} icon={KPI_ICONS[i]} {...k} />
        ))}
      </div>

      <OpsRow />

      <div className="flex flex-wrap items-stretch gap-4">
        <RevenueBars />
        <FleetStatusCard />
      </div>

      <RecordTable
        title="Bookings"
        tabs={[
          { label: 'Upcoming', selected: tab === 'Upcoming', onClick: () => setTab('Upcoming') },
          { label: 'Recent activity', selected: tab === 'Recent activity', onClick: () => setTab('Recent activity') },
        ]}
        columns={bookingColumns()}
        rows={rows}
        rowCountLabel={`${rows.length} of ${tab === 'Upcoming' ? 34 : 128}`}
        pageNote={`Showing 1–${rows.length} of ${(tab === 'Upcoming' ? 34 : 128).toLocaleString()} bookings`}
        minWidth="800px"
      />
    </PageContainer>
  )
}
