import { useState } from 'react'
import { CircleCheck, CircleX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { useBookingPayments } from '@/modules/payments/hooks/use-booking-payments'
import { useConfirmBooking, useDeclineBooking } from '../hooks/use-booking-request'
import { BookingDeclineDialog } from './BookingDeclineDialog'

interface BookingRequestActionsProps {
  reference: string
  renterName: string
}

/** The page's main action while a renter's own reservation waits for the company's answer. */
export function BookingRequestActions({ reference, renterName }: BookingRequestActionsProps) {
  const { t } = useTranslation('bookings')
  const [declining, setDeclining] = useState(false)
  // The payment card's own query, so asking here costs no second request.
  const { data: payments } = useBookingPayments(reference)
  const confirm = useConfirmBooking(reference)
  const decline = useDeclineBooking(reference, renterName)
  const busy = confirm.isPending || decline.isPending

  return (
    <>
      <PageActionButton
        icon={CircleX}
        label={t('details.actions.decline')}
        disabled={busy}
        onClick={() => setDeclining(true)}
      />
      <PageActionButton
        icon={CircleCheck}
        label={t('details.actions.confirm')}
        variant="solid"
        disabled={busy}
        onClick={() => confirm.mutate()}
      />

      <BookingDeclineDialog
        open={declining}
        onOpenChange={setDeclining}
        reference={reference}
        renterName={renterName}
        withdrawsLink={Boolean(payments?.openLink || payments?.depositRequested)}
        loading={decline.isPending}
        // Left open on a refusal, so the reason and message are still there to send again.
        onDecline={(input) => decline.mutate(input, { onSuccess: () => setDeclining(false) })}
      />
    </>
  )
}
