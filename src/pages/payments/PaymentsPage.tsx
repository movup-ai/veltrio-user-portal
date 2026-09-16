import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Banknote, CreditCard, Download, Landmark, Plus, ReceiptText } from 'lucide-react'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { FilterBar } from '@/components/data-display/FilterBar'
import { RecordTable } from '@/components/data-display/RecordTable'
import { StatStrip } from '@/components/data-display/StatStrip'
import { usePageHeaderActions } from '@/components/navigation/usePageHeaderActions'
import { useFormatters } from '@/i18n'
import { PAYMENTS } from '@/modules/payments/mock/payment.mock'
import { paymentColumns, paymentRow } from '@/modules/payments/utils/payment.utils'

/** 'All' is a view filter; the rest are canonical payment statuses matched against the data. */
const TABS = ['All', 'Paid', 'Pending', 'Failed', 'Refunded'] as const
type Tab = (typeof TABS)[number]

const TOTAL_PAYMENTS = 612

export function PaymentsPage() {
  const { t } = useTranslation('payments')
  const { t: tCommon } = useTranslation('common')
  const format = useFormatters()
  const [tab, setTab] = useState<Tab>('All')

  usePageHeaderActions([{ label: t('list.recordPayment'), icon: Plus }], [t])

  const payments = tab === 'All' ? PAYMENTS : PAYMENTS.filter((p) => p[5] === tab)
  const rows = payments.map(paymentRow)

  return (
    <PageContainer>
      <PageHeader
        title={t('list.title')}
        description={t('list.description')}
        actions={<PageActionButton icon={Download} label={t('list.payoutReport')} />}
      />

      <FilterBar
        searchPlaceholder={t('list.searchPlaceholder')}
        filters={[
          { label: t('list.filters.status'), value: tCommon('filters.any') },
          { label: t('list.filters.method'), value: tCommon('filters.all') },
          { label: t('list.filters.period'), value: format.date(new Date(2026, 8, 1), { month: 'short', year: 'numeric' }) },
        ]}
      />

      <StatStrip
        stats={[
          {
            icon: Banknote,
            label: t('list.stats.collected'),
            value: format.currency(284610),
            note: t('list.stats.collectedNote'),
          },
          {
            icon: ReceiptText,
            label: t('list.stats.outstanding'),
            value: format.currency(2283),
            note: t('list.stats.outstandingNote'),
          },
          { icon: CreditCard, label: t('list.stats.failed'), value: '1', note: t('list.stats.failedNote') },
          {
            icon: Landmark,
            label: t('list.stats.nextPayout'),
            value: format.currency(41905),
            note: t('list.stats.nextPayoutNote'),
          },
        ]}
      />

      <RecordTable
        tabs={TABS.map((value) => ({
          key: value,
          label: t(`list.tabs.${value}`),
          selected: tab === value,
          onClick: () => setTab(value),
        }))}
        columns={paymentColumns(t)}
        rows={rows}
        rowCountLabel={tCommon('table.countOf', { count: rows.length, total: TOTAL_PAYMENTS })}
        pageNote={t('list.pageNote', { shown: rows.length, total: TOTAL_PAYMENTS })}
        minWidth="840px"
      />
    </PageContainer>
  )
}
