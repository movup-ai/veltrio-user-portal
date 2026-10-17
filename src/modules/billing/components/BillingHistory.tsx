import { Download, ExternalLink, ReceiptText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { ToneBadge } from '@/components/data-display/ToneBadge'
import { Button } from '@/components/ui/button'
import { useFormatters } from '@/i18n'
import { DAY_FORMAT } from '@/lib/date-format'
import { SettingsSection } from '@/modules/settings/components/SettingsCard'
import { CHARGE_STATUS_TONE } from '../constants/billing.constants'
import { useBillingHistory } from '../hooks/use-billing'
import type { Charge } from '../types/billing.types'

/**
 * What Veltrio has charged the company: the plan's invoices and its credit purchases, each
 * with the document Stripe issued for it. Mounted for the owner only.
 */
export function BillingHistory() {
  const { t } = useTranslation('settings')
  const { data: history, isLoading, refetch } = useBillingHistory()

  return (
    <SettingsSection title={t('billing.history.title')} description={t('billing.history.description')}>
      {isLoading ? (
        <LoadingState />
      ) : !history ? (
        <ErrorState className="py-10" onRetry={() => void refetch()} />
      ) : history.charges.length === 0 ? (
        <EmptyState
          className="py-10"
          icon={ReceiptText}
          title={t('billing.history.emptyTitle')}
          description={t('billing.history.emptyDescription')}
        />
      ) : (
        <>
          <ul className="border-border divide-border-soft m-0 flex list-none flex-col divide-y rounded-[11px] border p-0">
            {history.charges.map((charge) => (
              <ChargeRow key={charge.id} charge={charge} />
            ))}
          </ul>
          {history.hasMore && <p className="text-fg-4 m-0 text-[12.5px]">{t('billing.history.more')}</p>}
        </>
      )}
    </SettingsSection>
  )
}

function ChargeRow({ charge }: { charge: Charge }) {
  const { t } = useTranslation('settings')
  const format = useFormatters()
  // With its year: a yearly plan's last invoice is a year back.
  const date = format.date(charge.at, DAY_FORMAT)

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-[13px]">
      {/* A line to itself on a phone, where beside the amount it was squeezed to a word a line. */}
      <div className="flex min-w-0 flex-1 basis-full flex-col gap-0.5 sm:basis-0">
        <span className="text-foreground font-medium">{t(`billing.history.kind.${charge.kind}`)}</span>
        <span className="text-fg-4 text-[12px]">
          {[date, charge.number && t('billing.history.invoiceNumber', { number: charge.number })]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>

      <span className="text-foreground font-semibold tabular-nums">
        {format.currency(charge.amount, charge.currency)}
      </span>
      {/* Fixed columns from a tablet up, so the amounts and buttons line up down the list. */}
      <span className="flex justify-start sm:w-[84px]">
        {charge.status && (
          <ToneBadge tone={CHARGE_STATUS_TONE[charge.status]}>
            {t(`billing.history.status.${charge.status}`)}
          </ToneBadge>
        )}
      </span>
      <span className="ml-auto flex justify-end sm:ml-0 sm:w-[104px]">
        {charge.invoiceUrl ? (
          <Button variant="outline" size="sm" asChild>
            <a
              href={charge.invoiceUrl}
              // Named by its number: every row's button would otherwise read the same aloud.
              aria-label={t('billing.history.downloadInvoice', { number: charge.number ?? date })}
            >
              <Download aria-hidden />
              {t('billing.history.invoice')}
            </a>
          </Button>
        ) : charge.receiptUrl ? (
          <Button variant="outline" size="sm" asChild>
            <a
              href={charge.receiptUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={t('billing.history.viewReceipt', { date })}
            >
              <ExternalLink aria-hidden />
              {t('billing.history.receipt')}
            </a>
          </Button>
        ) : null}
      </span>
    </li>
  )
}
