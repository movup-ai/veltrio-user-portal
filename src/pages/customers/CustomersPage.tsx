import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, IdCard, Plus, Repeat, Users } from 'lucide-react'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { FilterBar } from '@/components/data-display/FilterBar'
import { RecordTable } from '@/components/data-display/RecordTable'
import { StatStrip } from '@/components/data-display/StatStrip'
import { useFormatters } from '@/i18n'
import { CUSTOMERS } from '@/modules/customers/mock/customer.mock'
import { customerColumns, customerRow } from '@/modules/customers/utils/customer.utils'

const TABS = ['All', 'Active', 'Needs review'] as const
type Tab = (typeof TABS)[number]

const NEEDS_REVIEW = new Set(['Verify docs', 'Flagged'])

const TOTAL_CUSTOMERS = 1284

export function CustomersPage() {
  const { t } = useTranslation('customers')
  const { t: tCommon } = useTranslation('common')
  const format = useFormatters()
  const [tab, setTab] = useState<Tab>('All')


  const customers =
    tab === 'All' ? CUSTOMERS : tab === 'Active' ? CUSTOMERS.filter((c) => c[6] === 'Active') : CUSTOMERS.filter((c) => NEEDS_REVIEW.has(c[6]))
  const rows = customers.map(customerRow)

  return (
    <PageContainer>
      <PageHeader
        title={t('list.title')}
        description={t('list.description')}
        actions={
          <>
            <PageActionButton icon={Download} label={t('list.export')} />
            <PageActionButton icon={Plus} label={t('list.addCustomer')} variant="solid" />
          </>
        }
      />

      <FilterBar
        searchPlaceholder={t('list.searchPlaceholder')}
        filters={[
          { label: t('list.filters.status'), value: tCommon('filters.any') },
          { label: t('list.filters.joined'), value: t('list.filters.joinedValue') },
        ]}
      />

      <StatStrip
        stats={[
          {
            icon: Users,
            label: t('list.stats.total'),
            value: format.number(TOTAL_CUSTOMERS),
            note: t('list.stats.totalNote'),
          },
          { icon: Repeat, label: t('list.stats.repeatRate'), value: '38%', note: t('list.stats.repeatRateNote') },
          { icon: IdCard, label: t('list.stats.docsToVerify'), value: '5', note: t('list.stats.docsToVerifyNote') },
        ]}
      />

      <RecordTable
        tabs={TABS.map((value) => ({
          key: value,
          label: t(`list.tabs.${value}`),
          selected: tab === value,
          onClick: () => setTab(value),
        }))}
        columns={customerColumns(t)}
        rows={rows}
        rowCountLabel={tCommon('table.countOf', { count: rows.length, total: format.number(TOTAL_CUSTOMERS) })}
        pageNote={t('list.pageNote', { shown: rows.length, total: format.number(TOTAL_CUSTOMERS) })}
        minWidth="860px"
      />
    </PageContainer>
  )
}
