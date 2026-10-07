import { FileDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useFormatters } from '@/i18n'
import type { BookingPayments, ReceiptLink } from '../types/booking-payment.types'
import { receiptLinkUrl } from '../utils/booking-payment.utils'
import { ShareLinkDialog, type LinkRecipient } from './ShareLinkDialog'

interface ReceiptLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  link: ReceiptLink
  payments: BookingPayments
  renter: LinkRecipient
  companyName: string
  subdomain: string
  reference: string
  downloading: boolean
  onDownload: () => void
}

/** The renter's receipt, as a link to send and a PDF for the counter to print or attach. */
export function ReceiptLinkDialog({
  open,
  onOpenChange,
  link,
  payments,
  renter,
  companyName,
  subdomain,
  reference,
  downloading,
  onDownload,
}: ReceiptLinkDialogProps) {
  const { t } = useTranslation('payments')
  const format = useFormatters()
  const money = (amount: number) => format.currency(amount, payments.currency)
  const url = receiptLinkUrl(subdomain, link)
  const captured = payments.deposit?.status === 'captured' ? payments.deposit.captured : 0

  return (
    <ShareLinkDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('booking.receipt.title')}
      description={t('booking.receipt.description', { name: renter.name, reference })}
      summary={[
        { label: t('booking.receipt.paid'), value: money(payments.paid - payments.refunded) },
        ...(captured > 0 ? [{ label: t('booking.receipt.depositCaptured'), value: money(captured) }] : []),
        ...(payments.balance > 0
          ? [{ label: t('booking.receipt.balance'), value: money(payments.balance) }]
          : []),
      ]}
      url={url}
      recipient={renter}
      subject={t('booking.receipt.subject', { company: companyName, reference })}
      message={t('booking.receipt.message', { name: renter.name, reference, url })}
      footer={
        <Button
          type="button"
          variant="outline"
          onClick={onDownload}
          loading={downloading}
          className="gap-1.5"
        >
          <FileDown className="size-4" aria-hidden />
          {t('booking.receipt.download')}
        </Button>
      }
    />
  )
}
