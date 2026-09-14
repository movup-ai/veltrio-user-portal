import { useState } from 'react'
import { Car, Gauge, Plus, Tag, Upload, Wrench } from 'lucide-react'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { FilterBar } from '@/components/data-display/FilterBar'
import { RecordTable } from '@/components/data-display/RecordTable'
import { StatStrip } from '@/components/data-display/StatStrip'
import { usePageHeaderActions } from '@/components/navigation/usePageHeaderActions'
import { VEHICLES } from '@/modules/vehicles/mock/vehicle.mock'
import { vehicleColumns, vehicleRow } from '@/modules/vehicles/utils/vehicle.utils'

const TABS = ['All', 'Available', 'On rent', 'Maintenance'] as const
type Tab = (typeof TABS)[number]

export function VehiclesPage() {
  const [tab, setTab] = useState<Tab>('All')
  usePageHeaderActions([{ label: 'Add vehicle', icon: Plus }])

  const vehicles = tab === 'All' ? VEHICLES : VEHICLES.filter((v) => v[5] === tab)
  const rows = vehicles.map(vehicleRow)

  return (
    <PageContainer>
      <PageHeader title="Vehicles" description="Manage your rental fleet" actions={<PageActionButton icon={Upload} label="Import CSV" />} />

      <FilterBar
        searchPlaceholder="Search make, model, plate or VIN"
        filters={[
          { label: 'Status', value: 'Any' },
          { label: 'Location', value: 'All 3' },
          { label: 'Class', value: 'All' },
        ]}
      />

      <StatStrip
        stats={[
          { icon: Car, label: 'Fleet size', value: '142', note: '8 added this quarter' },
          { icon: Gauge, label: 'Utilization', value: '74%', note: 'Target 70%' },
          { icon: Wrench, label: 'In maintenance', value: '12', note: '3 overdue for service' },
          { icon: Tag, label: 'Avg. daily rate', value: '$163', note: '+$7 vs. last month' },
        ]}
      />

      <RecordTable
        tabs={TABS.map((t) => ({ label: t, selected: tab === t, onClick: () => setTab(t) }))}
        columns={vehicleColumns()}
        rows={rows}
        rowCountLabel={`${rows.length} of 142`}
        pageNote={`Showing 1–${rows.length} of 142 vehicles`}
        minWidth="880px"
      />
    </PageContainer>
  )
}
