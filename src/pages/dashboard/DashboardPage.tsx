import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Banknote, CalendarCheck, Download, Gauge, KeyRound, Plus } from 'lucide-react'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { RecordTable } from '@/components/data-display/RecordTable'
import { useFormatters } from '@/i18n'
import { BOOKINGS_RECENT, BOOKINGS_UPCOMING } from '@/modules/bookings/mock/booking.mock'
import { bookingColumns, bookingRow } from '@/modules/bookings/utils/booking.utils'
import { FleetStatusCard, KpiCard, KPIS, OpsRow, RevenueBars } from '@/modules/dashboard'

const KPI_ICONS = [Banknote, KeyRound, Gauge, CalendarCheck]
const RANGES = ['7d', '30d', '90d'] as const

const BOOKING_TABS = ['upcoming', 'recent'] as const
type BookingTab = (typeof BOOKING_TABS)[number]

const TAB_TOTALS: Record<BookingTab, number> = { upcoming: 34, recent: 128 }

export function DashboardPage() {
  const { t } = useTranslation('dashboard')
  const { t: tBookings } = useTranslation('bookings')
  const format = useFormatters()
  const navigate = useNavigate()
  const [range, setRange] = useState<(typeof RANGES)[number]>('30d')
  const [tab, setTab] = useState<BookingTab>('upcoming')


  const rows = (tab === 'upcoming' ? BOOKINGS_UPCOMING : BOOKINGS_RECENT).map((b) => bookingRow(b))

  return (
    <PageContainer>
      <PageHeader
        title={t('greeting', { name: 'Diego' })}
        description={t('subtitle', {
          date: format.date(new Date(), { weekday: 'long', day: 'numeric', month: 'long' }),
          pickups: 6,
          returns: 4,
        })}
        actions={
          <>
            <div className="bg-surface border-border flex h-[34px] overflow-hidden rounded-[9px] border">
              {RANGES.map((r, i) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className="hover:bg-surface-3 flex items-center px-[13px] text-[12.5px] transition-colors"
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
            <PageActionButton icon={Download} label={t('export')} />
            <PageActionButton
              icon={Plus}
              label={t('newBooking')}
              variant="solid"
              onClick={() => navigate('/app/bookings/new')}
            />
          </>
        }
      />

      <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        {KPIS.map((k, i) => (
          <KpiCard key={k.labelKey} icon={KPI_ICONS[i]} {...k} />
        ))}
      </div>

      <OpsRow />

      <div className="flex flex-wrap items-stretch gap-4">
        <RevenueBars />
        <FleetStatusCard />
      </div>

      <RecordTable
        title={t('bookings.title')}
        tabs={BOOKING_TABS.map((value) => ({
          key: value,
          label: t(`bookings.tabs.${value}`),
          selected: tab === value,
          onClick: () => setTab(value),
        }))}
        columns={bookingColumns(tBookings)}
        rows={rows}
        rowCountLabel={`${rows.length} / ${format.number(TAB_TOTALS[tab])}`}
        pageNote={t('bookings.pageNote', { shown: rows.length, total: format.number(TAB_TOTALS[tab]) })}
        minWidth="800px"
      />
    </PageContainer>
  )
}
