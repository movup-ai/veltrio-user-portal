import { useState } from 'react'
import { Banknote, CreditCard, Download, Landmark, Plus, ReceiptText } from 'lucide-react'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { FilterBar } from '@/components/data-display/FilterBar'
import { RecordTable } from '@/components/data-display/RecordTable'
import { StatStrip } from '@/components/data-display/StatStrip'
import { usePageHeaderActions } from '@/components/navigation/usePageHeaderActions'
import { PAYMENTS } from '@/modules/payments/mock/payment.mock'
import { paymentColumns, paymentRow } from '@/modules/payments/utils/payment.utils'

const TABS = ['All', 'Paid', 'Pending', 'Failed', 'Refunded'] as const
type Tab = (typeof TABS)[number]

export function PaymentsPage() {
  const [tab, setTab] = useState<Tab>('All')
  usePageHeaderActions([{ label: 'Record payment', icon: Plus }])

  const payments = tab === 'All' ? PAYMENTS : PAYMENTS.filter((p) => p[5] === tab)
  const rows = payments.map(paymentRow)

  return (
    <PageContainer>
      <PageHeader
        title="Payments"
        description="Invoices, captures, refunds and failed charges"
        actions={<PageActionButton icon={Download} label="Payout report" />}
      />

      <FilterBar
        searchPlaceholder="Search invoice, customer or booking"
        filters={[
          { label: 'Status', value: 'Any' },
          { label: 'Method', value: 'All' },
          { label: 'Period', value: 'Sep 2026' },
        ]}
      />

      <StatStrip
        stats={[
          { icon: Banknote, label: 'Collected (MTD)', value: '$284,610', note: 'Net of $1,240 refunds' },
          { icon: ReceiptText, label: 'Outstanding', value: '$2,283', note: '2 invoices unpaid' },
          { icon: CreditCard, label: 'Failed charges', value: '1', note: 'Retry scheduled tonight' },
          { icon: Landmark, label: 'Next payout', value: '$41,905', note: 'Sep 16 · Chase ·· 8821' },
        ]}
      />

      <RecordTable
        tabs={TABS.map((t) => ({ label: t, selected: tab === t, onClick: () => setTab(t) }))}
        columns={paymentColumns()}
        rows={rows}
        rowCountLabel={`${rows.length} of 612`}
        pageNote={`Showing 1–${rows.length} of 612 payments`}
        minWidth="840px"
      />
    </PageContainer>
  )
}
