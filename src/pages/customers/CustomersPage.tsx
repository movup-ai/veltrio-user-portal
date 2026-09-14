import { useState } from 'react'
import { Download, IdCard, Plus, Repeat, Users } from 'lucide-react'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { FilterBar } from '@/components/data-display/FilterBar'
import { RecordTable } from '@/components/data-display/RecordTable'
import { StatStrip } from '@/components/data-display/StatStrip'
import { usePageHeaderActions } from '@/components/navigation/usePageHeaderActions'
import { CUSTOMERS } from '@/modules/customers/mock/customer.mock'
import { customerColumns, customerRow } from '@/modules/customers/utils/customer.utils'

const TABS = ['All', 'Active', 'Needs review'] as const
type Tab = (typeof TABS)[number]

const NEEDS_REVIEW = new Set(['Verify docs', 'Flagged'])

export function CustomersPage() {
  const [tab, setTab] = useState<Tab>('All')
  usePageHeaderActions([{ label: 'Add customer', icon: Plus }])

  const customers =
    tab === 'All' ? CUSTOMERS : tab === 'Active' ? CUSTOMERS.filter((c) => c[6] === 'Active') : CUSTOMERS.filter((c) => NEEDS_REVIEW.has(c[6]))
  const rows = customers.map(customerRow)

  return (
    <PageContainer>
      <PageHeader
        title="Customers"
        description="Renter profiles, documents and rental history"
        actions={<PageActionButton icon={Download} label="Export" />}
      />

      <FilterBar
        searchPlaceholder="Search name, email or licence"
        filters={[
          { label: 'Status', value: 'Any' },
          { label: 'Joined', value: 'Last 12 mo' },
        ]}
      />

      <StatStrip
        stats={[
          { icon: Users, label: 'Total customers', value: '1,284', note: '46 new this month' },
          { icon: Repeat, label: 'Repeat rate', value: '38%', note: '2+ rentals in 12 months' },
          { icon: IdCard, label: 'Docs to verify', value: '5', note: 'Blocks pickup until cleared' },
        ]}
      />

      <RecordTable
        tabs={TABS.map((t) => ({ label: t, selected: tab === t, onClick: () => setTab(t) }))}
        columns={customerColumns()}
        rows={rows}
        rowCountLabel={`${rows.length} of 1,284`}
        pageNote={`Showing 1–${rows.length} of 1,284 customers`}
        minWidth="860px"
      />
    </PageContainer>
  )
}
