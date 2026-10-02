import { FileDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Button } from '@/components/ui/button'
import { useFormatters } from '@/i18n'
import { bookingPaymentApi } from '@/modules/payments/api/booking-payment.api'
import { CompanyBadge, PublicNotice, PublicPanel, TripCard } from '@/modules/payments/components/PublicPage'
import { usePublicReceipt } from '@/modules/payments/hooks/use-booking-payments'
import type { PublicReceipt, ReceiptLink } from '@/modules/payments/types/booking-payment.types'
import { linkIsGone } from '@/modules/payments/utils/booking-payment.utils'

/**
 * The renter's receipt, from the link the counter sent or the payment page. Needs no login: the
 * token in the link is the proof. The PDF is the same one the counter downloads.
 */
export function ReceiptPage() {
  const { t } = useTranslation('payments')
  const { tenantId = '', bookingId = '', token = '' } = useParams()
  const link: ReceiptLink = { tenantId, bookingId, token }
  const { data: receipt, isLoading, error, refetch, isRefetching } = usePublicReceipt(link)

  if (isLoading) return <LoadingState />
  if (!receipt) {
    if (error && !linkIsGone(error)) {
      return (
        <PublicPanel>
          <PublicNotice icon="clock" title={t('pay.unreachable.title')} body={t('pay.unreachable.body')} />
          <Button type="button" loading={isRefetching} onClick={() => void refetch()} className="w-full">
            {t('pay.unreachable.retry')}
          </Button>
        </PublicPanel>
      )
    }
    return (
      <PublicPanel>
        <PublicNotice icon="alert" title={t('receipt.invalid.title')} body={t('receipt.invalid.body')} />
      </PublicPanel>
    )
  }

  return (
    <PublicPanel>
      <CompanyBadge companyName={receipt.companyName} reference={receipt.reference} />
      <div>
        <h1 className="text-section-title m-0">{t('receipt.title')}</h1>
        <p className="text-description m-0 mt-0.5">{receipt.number}</p>
      </div>
      <TripCard trip={receipt} />
      <Payments receipt={receipt} />
      <Button variant="outline" asChild className="gap-1.5">
        <a href={bookingPaymentApi.receiptPdfUrl(link)}>
          <FileDown className="size-4" aria-hidden />
          {t('receipt.download')}
        </a>
      </Button>
    </PublicPanel>
  )
}

function Payments({ receipt }: { receipt: PublicReceipt }) {
  const { t } = useTranslation('payments')
  const format = useFormatters()
  const money = (amount: number) => format.currency(amount, receipt.currency)

  return (
    <div className="flex flex-col">
      <ul className="divide-border-soft m-0 flex list-none flex-col divide-y p-0">
        {receipt.payments.map((payment, index) => (
          <li key={index} className="flex items-baseline justify-between gap-3 py-2.5">
            <span className="flex min-w-0 flex-col">
              <span className="text-[13.5px] font-medium">
                {payment.kind === 'deposit' ? t('receipt.deposit') : t('receipt.rental')}
              </span>
              <span className="text-fg-3 text-[12px]">
                {[payment.completedAt && format.shortDate(payment.completedAt), payment.method]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
            <span className="shrink-0 text-right text-[13.5px] font-semibold tabular-nums">
              {money(payment.amount)}
              {payment.refunded > 0 && (
                <span className="text-fg-3 block text-[12px] font-normal">
                  {t('receipt.refunded', { amount: money(payment.refunded) })}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <div className="border-border-soft flex items-baseline justify-between gap-3 border-t pt-3">
        <span className="text-[14px] font-semibold">{t('receipt.received')}</span>
        <span className="text-[22px] leading-none font-bold tabular-nums">{money(receipt.received)}</span>
      </div>
      {receipt.balance > 0 && (
        <p className="text-fg-3 m-0 mt-1.5 text-right text-[12.5px]">
          {t('receipt.balance', { amount: money(receipt.balance) })}
        </p>
      )}
    </div>
  )
}
