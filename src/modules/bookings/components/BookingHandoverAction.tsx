import { ArrowDownLeft, KeyRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { useBookingPayments } from '@/modules/payments/hooks/use-booking-payments'
import { useBookingHandover } from '../hooks/use-booking-handover'
import { handoverButton } from '../utils/booking.handover'

/** The page's main action: Check in or Return, as the booking's payments and status allow. */
export function BookingHandoverAction({ reference }: { reference: string }) {
  const { t } = useTranslation('bookings')
  const { t: tPayments } = useTranslation('payments')
  const { data: payments } = useBookingPayments(reference)
  const pickUp = useBookingHandover(reference, 'pickUp')
  const returnVehicle = useBookingHandover(reference, 'returnVehicle')
  const button = payments ? handoverButton(payments.actions) : null
  if (!button) return null

  const mutation = button.action === 'pickUp' ? pickUp : returnVehicle
  const { reason } = button.rule
  return (
    <PageActionButton
      icon={button.action === 'pickUp' ? KeyRound : ArrowDownLeft}
      label={button.action === 'pickUp' ? t('details.actions.checkIn') : t('details.actions.returnVehicle')}
      variant="solid"
      disabled={!button.rule.allowed || mutation.isPending}
      title={reason ? tPayments(`booking.reasons.${reason}`) : undefined}
      onClick={() => mutation.mutate()}
    />
  )
}
