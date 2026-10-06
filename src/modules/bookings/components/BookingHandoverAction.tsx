import { ArrowDownLeft, FileCheck, KeyRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useBookingContract } from '@/modules/contracts/hooks/use-booking-contract'
import { useBookingPayments } from '@/modules/payments/hooks/use-booking-payments'
import { useBookingHandover } from '../hooks/use-booking-handover'
import { handoverButton, nextStepNeeds } from '../utils/booking.handover'

const BUTTONS = {
  pickUp: { icon: KeyRound, label: 'details.actions.handOver' },
  returnVehicle: { icon: ArrowDownLeft, label: 'details.actions.returnVehicle' },
  close: { icon: FileCheck, label: 'details.actions.closeBooking' },
} as const

/**
 * The page's main action: Hand over, Return or Close, as the booking's status and money allow.
 * Switched off, it says on hover everything it is waiting for.
 */
export function BookingHandoverAction({ reference }: { reference: string }) {
  const { t } = useTranslation('bookings')
  const { t: tPayments } = useTranslation('payments')
  const { data: payments } = useBookingPayments(reference)
  // The agreement card's own query, so asking here costs no second request.
  const { data: contract } = useBookingContract(reference)
  const mutations = {
    pickUp: useBookingHandover(reference, 'pickUp'),
    returnVehicle: useBookingHandover(reference, 'returnVehicle'),
    close: useBookingHandover(reference, 'close'),
  }
  const action = payments ? handoverButton(payments.actions) : null
  if (!payments || !action) return null

  const { icon, label } = BUTTONS[action.action]
  const mutation = mutations[action.action]
  const { allowed, reason } = action.rule
  const button = (
    <PageActionButton
      icon={icon}
      label={t(label)}
      variant="solid"
      disabled={!allowed || mutation.isPending}
      onClick={() => mutation.mutate()}
    />
  )
  if (allowed) return button

  // Until the agreement loads, the API's own reason says whether the signature is what is missing.
  const signed = contract ? contract.status === 'signed' : reason !== 'contract_unsigned'
  const needs = nextStepNeeds(payments, signed)
  // The span is what makes the tooltip work: a disabled button fires no hover of its own.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{button}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end" className="max-w-[260px]">
        {needs.length > 0 ? (
          <>
            <p className="m-0 font-semibold">{t('details.actions.waitingFor')}</p>
            <ul className="m-0 mt-1 list-disc pl-4">
              {needs.map((need) => (
                <li key={need}>{t(`details.actions.needs.${need}`)}</li>
              ))}
            </ul>
          </>
        ) : (
          reason && tPayments(`booking.reasons.${reason}`)
        )}
      </TooltipContent>
    </Tooltip>
  )
}
