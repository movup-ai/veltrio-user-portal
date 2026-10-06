import { useTranslation } from 'react-i18next'
import { useFormatters } from '@/i18n'
import type { PaymentLink } from '../types/booking-payment.types'
import { linkPurpose, paymentLinkUrl } from '../utils/booking-payment.utils'
import { ShareLinkDialog, type LinkRecipient } from './ShareLinkDialog'

interface PaymentLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  link: PaymentLink
  renter: LinkRecipient
  companyName: string
  subdomain: string
  reference: string
  /** A deposit the link does not ask for yet, mentioned so the counter can say it is coming. */
  depositLater: number
}

/** The renter's payment link: the rental, the deposit hold, or both, worded for what it asks. */
export function PaymentLinkDialog({
  open,
  onOpenChange,
  link,
  renter,
  companyName,
  subdomain,
  reference,
  depositLater,
}: PaymentLinkDialogProps) {
  const { t } = useTranslation('payments')
  const format = useFormatters()
  const purpose = linkPurpose(link)
  const amount = format.currency(link.amount, link.currency)
  const deposit = format.currency(link.deposit, link.currency)
  const url = paymentLinkUrl(subdomain, link)

  return (
    <ShareLinkDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t(`booking.link.title.${purpose}`)}
      description={t(`booking.link.description.${purpose}`, { name: renter.name })}
      summary={[
        ...(link.amount > 0 ? [{ label: t('booking.link.rental'), value: amount }] : []),
        ...(link.deposit > 0 ? [{ label: t('booking.link.depositHold'), value: deposit }] : []),
      ]}
      url={url}
      recipient={renter}
      subject={t(`booking.link.subject.${purpose}`, { company: companyName, reference })}
      message={t(`booking.link.message.${purpose}`, { name: renter.name, amount, deposit, reference, url })}
      footer={
        purpose === 'payment' &&
        depositLater > 0 && (
          <p className="text-fg-4 m-0 text-[12px]" style={{ textWrap: 'pretty' }}>
            {t('booking.link.depositLater', { deposit: format.currency(depositLater, link.currency) })}
          </p>
        )
      }
    />
  )
}
