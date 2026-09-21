import { useTranslation } from 'react-i18next'
import { CalendarDays, Gauge, Plus, Tag, TrendingUp } from 'lucide-react'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { FilterBar } from '@/components/data-display/FilterBar'
import { RecordTable } from '@/components/data-display/RecordTable'
import { StatStrip } from '@/components/data-display/StatStrip'
import { useFormatters } from '@/i18n'
import { PRICING } from '@/modules/pricing/mock/pricing.mock'
import { pricingColumns, pricingRow } from '@/modules/pricing/utils/pricing.utils'

const TOTAL_RULES = 8

export function PricingPage() {
  const { t } = useTranslation('pricing')
  const { t: tCommon } = useTranslation('common')
  const { t: tDomain } = useTranslation('domain')
  const format = useFormatters()

  const rows = PRICING.map(pricingRow)

  return (
    <PageContainer>
      <PageHeader
        title={t('list.title')}
        description={t('list.description')}
        actions={
          <>
            <PageActionButton icon={CalendarDays} label={t('list.rateCalendar')} />
            <PageActionButton icon={Plus} label={t('list.newRule')} variant="solid" />
          </>
        }
      />

      <FilterBar
        searchPlaceholder={t('list.searchPlaceholder')}
        filters={[
          { label: t('list.filters.status'), value: tCommon('filters.any') },
          { label: t('list.filters.scope'), value: t('list.filters.scopeValue') },
        ]}
      />

      <StatStrip
        stats={[
          { icon: Tag, label: t('list.stats.activeRules'), value: '6', note: t('list.stats.activeRulesNote') },
          {
            icon: Gauge,
            label: t('list.stats.blendedRate'),
            value: `${format.currency(163)}${tDomain('billingBasisSuffix.day')}`,
            note: t('list.stats.blendedRateNote'),
          },
          {
            icon: TrendingUp,
            label: t('list.stats.upliftEarned'),
            value: format.currency(18420),
            note: t('list.stats.upliftEarnedNote'),
          },
        ]}
      />

      <RecordTable
        title={t('list.rulesTitle')}
        columns={pricingColumns(t)}
        rows={rows}
        rowCountLabel={tCommon('table.countOf', { count: rows.length, total: TOTAL_RULES })}
        pageNote={t('list.pageNote', { shown: rows.length, total: TOTAL_RULES })}
        minWidth="820px"
      />
    </PageContainer>
  )
}
