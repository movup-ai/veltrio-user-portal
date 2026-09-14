import { CalendarDays, Gauge, Plus, Tag, TrendingUp } from 'lucide-react'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { FilterBar } from '@/components/data-display/FilterBar'
import { RecordTable } from '@/components/data-display/RecordTable'
import { StatStrip } from '@/components/data-display/StatStrip'
import { usePageHeaderActions } from '@/components/navigation/usePageHeaderActions'
import { PRICING } from '@/modules/pricing/mock/pricing.mock'
import { pricingColumns, pricingRow } from '@/modules/pricing/utils/pricing.utils'

export function PricingPage() {
  usePageHeaderActions([{ label: 'New rule', icon: Plus }])
  const rows = PRICING.map(pricingRow)

  return (
    <PageContainer>
      <PageHeader
        title="Pricing"
        description="Seasonal uplifts, surcharges and negotiated rates"
        actions={<PageActionButton icon={CalendarDays} label="Rate calendar" />}
      />

      <FilterBar
        searchPlaceholder="Search rule name"
        filters={[
          { label: 'Status', value: 'Any' },
          { label: 'Scope', value: 'All classes' },
        ]}
      />

      <StatStrip
        stats={[
          { icon: Tag, label: 'Active rules', value: '6', note: '1 scheduled, 1 paused' },
          { icon: Gauge, label: 'Blended rate', value: '$163/day', note: 'Across all classes' },
          { icon: TrendingUp, label: 'Uplift earned (MTD)', value: '$18,420', note: '6.5% of gross revenue' },
        ]}
      />

      <RecordTable
        title="Pricing rules"
        columns={pricingColumns()}
        rows={rows}
        rowCountLabel={`${rows.length} of 8`}
        pageNote={`Showing 1–${rows.length} of 8 rules`}
        minWidth="820px"
      />
    </PageContainer>
  )
}
