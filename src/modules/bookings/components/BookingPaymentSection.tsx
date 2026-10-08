import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { usePermissions } from '@/components/feedback/Can'
import { ManualPaymentDialog, RefundDialog } from '@/modules/payments/components/BookingMoneyDialogs'
import { PaymentLinkDialog } from '@/modules/payments/components/PaymentLinkDialog'
import { ReceiptLinkDialog } from '@/modules/payments/components/ReceiptLinkDialog'
import { ReturnChargesDialog } from '@/modules/payments/components/ReturnChargesDialog'
import type { LinkRecipient } from '@/modules/payments/components/ShareLinkDialog'
import {
  useBookingDocument,
  useBookingPayments,
  useCreatePaymentLink,
  useRecordManualPayment,
  useReceiptLink,
  useRefundPayment,
  useReleaseDeposit,
  useRequestDeposit,
  useSettleReturn,
} from '@/modules/payments/hooks/use-booking-payments'
import type { PaymentLink, ReceiptLink } from '@/modules/payments/types/booking-payment.types'
import { refundAttempt, type RefundAttempt } from '@/modules/payments/utils/booking-payment.utils'
import { useOrganizationStore } from '@/state/organization.store'
import { hasAnyPermission } from '@/utils/permissions'
import type { BookingChargeLine } from '../types/booking.types'
import { BookingPaymentCard, type PaymentAction } from './BookingPaymentCard'

type MoneyDialog = 'link' | 'receipt' | 'manual' | 'charges' | 'refund'

interface BookingPaymentSectionProps {
  reference: string
  renter: LinkRecipient
  charges: BookingChargeLine[]
  days: number
  /** Worked out from the handover readings, offered as the return's first charge. */
  overMileage?: { miles: number; amount: number }
}

/** The payment card with its data and every money action behind it. */
export function BookingPaymentSection({
  reference,
  renter,
  charges,
  days,
  overMileage,
}: BookingPaymentSectionProps) {
  const { t } = useTranslation('bookings')
  const { data: payments, isLoading, isError, refetch } = useBookingPayments(reference)
  const companyName = useOrganizationStore((state) => state.membership?.organizationName ?? '')
  const subdomain = useOrganizationStore((state) => state.membership?.subdomain ?? '')
  const canRefund = hasAnyPermission(usePermissions(), ['payments.refund'])
  const createLink = useCreatePaymentLink(reference)
  const recordManual = useRecordManualPayment(reference)
  const requestDeposit = useRequestDeposit(reference)
  const settle = useSettleReturn(reference)
  const release = useReleaseDeposit(reference)
  const refund = useRefundPayment(reference)
  const download = useBookingDocument(reference)
  const receiptLink = useReceiptLink(reference)
  const [dialog, setDialog] = useState<MoneyDialog | null>(null)
  // The latest link made, either kind: its token is shown once, so it is kept to show here.
  const [link, setLink] = useState<PaymentLink>()
  const [receipt, setReceipt] = useState<ReceiptLink>()
  // Outlives the dialog: a refund whose answer never came is retried under the same id.
  const lastRefund = useRef<RefundAttempt>(undefined)
  const close = () => setDialog(null)

  if (isLoading) {
    return (
      <Card as="section" className="p-[18px]">
        <LoadingState />
      </Card>
    )
  }
  if (isError || !payments) {
    return (
      <Card as="section" className="p-[18px]">
        <ErrorState onRetry={() => void refetch()} />
      </Card>
    )
  }

  const openLink = (made: PaymentLink) => {
    setLink(made)
    setDialog('link')
  }

  const onAction = (action: PaymentAction) => {
    switch (action) {
      case 'sendLink':
        // The API hands back the link already out when nothing changed, so asking again is safe.
        // The button spins while a new one is made; the dialog opens with the link in hand.
        createLink.mutate(undefined, { onSuccess: openLink })
        return
      case 'markPaid':
        setDialog('manual')
        return
      case 'settleReturn':
        setDialog('charges')
        return
      case 'refund':
        setDialog('refund')
        return
      case 'requestDeposit':
        requestDeposit.mutate(undefined, { onSuccess: openLink })
        return
      case 'releaseDeposit':
        release.mutate()
        return
      case 'downloadInvoice':
        download.mutate('invoice')
        return
      case 'sendReceipt':
        receiptLink.mutate(undefined, {
          onSuccess: (made) => {
            setReceipt(made)
            setDialog('receipt')
          },
        })
    }
  }

  return (
    <>
      <BookingPaymentCard
        payments={payments}
        charges={charges}
        days={days}
        canRefund={canRefund}
        busy={{
          sendLink: createLink.isPending,
          requestDeposit: requestDeposit.isPending,
          releaseDeposit: release.isPending,
          downloadInvoice: download.isPending && download.variables === 'invoice',
          sendReceipt: receiptLink.isPending,
        }}
        onAction={onAction}
      />
      {link && (
        <PaymentLinkDialog
          open={dialog === 'link'}
          onOpenChange={(open) => !open && close()}
          link={link}
          renter={renter}
          companyName={companyName}
          subdomain={subdomain}
          reference={reference}
          depositLater={payments.deposit ? 0 : payments.depositAmount}
        />
      )}
      {receipt && (
        <ReceiptLinkDialog
          open={dialog === 'receipt'}
          onOpenChange={(open) => !open && close()}
          link={receipt}
          payments={payments}
          renter={renter}
          companyName={companyName}
          subdomain={subdomain}
          reference={reference}
          downloading={download.isPending && download.variables === 'receipt'}
          onDownload={() => download.mutate('receipt')}
        />
      )}
      <ManualPaymentDialog
        open={dialog === 'manual'}
        onOpenChange={(open) => !open && close()}
        payments={payments}
        loading={recordManual.isPending}
        onSubmit={(amount, method) => recordManual.mutate({ amount, method }, { onSuccess: close })}
      />
      <ReturnChargesDialog
        open={dialog === 'charges'}
        onOpenChange={(open) => !open && close()}
        payments={payments}
        suggested={
          overMileage && {
            over_mileage: {
              amount: overMileage.amount,
              note: t('details.payment.returnCharges.overMileageNote', { miles: overMileage.miles }),
            },
          }
        }
        loading={settle.isPending}
        onSubmit={(entered) => settle.mutate(entered, { onSuccess: close })}
      />
      <RefundDialog
        open={dialog === 'refund'}
        onOpenChange={(open) => !open && close()}
        payments={payments}
        loading={refund.isPending}
        onSubmit={(payment, amount) => {
          const attempt = refundAttempt(lastRefund.current, payment.id, amount, () => crypto.randomUUID())
          lastRefund.current = attempt
          refund.mutate(
            { paymentId: payment.id, amount, requestId: attempt.requestId },
            {
              onSuccess: () => {
                lastRefund.current = undefined
                close()
              },
            },
          )
        }}
      />
    </>
  )
}
