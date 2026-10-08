import { useState } from 'react'
import { ArrowDownLeft, FileCheck, KeyRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useBookingContract } from '@/modules/contracts/hooks/use-booking-contract'
import { useBookingPayments } from '@/modules/payments/hooks/use-booking-payments'
import { useBookingHandover } from '../hooks/use-booking-handover'
import type { BookingCondition } from '../types/booking.types'
import { handoverButton, nextStepNeeds } from '../utils/booking.handover'
import { BookingConditionDialog } from './BookingConditionDialog'

const BUTTONS = {
  pickUp: { icon: KeyRound, label: 'details.actions.handOver' },
  returnVehicle: { icon: ArrowDownLeft, label: 'details.actions.returnVehicle' },
  close: { icon: FileCheck, label: 'details.actions.closeBooking' },
} as const

interface BookingHandoverActionProps {
  reference: string
  /** What the handover form starts from and measures a return against. */
  pickupCondition?: BookingCondition
  vehicleMileage?: number
  vehicleElectric?: boolean
}

/**
 * The page's main action: Hand over, Return or Close, as the booking's status and money allow.
 * Switched off, it says on hover everything it is waiting for. Hand over and Return open the
 * form the car's readings are taken on; Close asks first, because it cannot be undone.
 */
export function BookingHandoverAction({ reference, ...condition }: BookingHandoverActionProps) {
  const { t } = useTranslation('bookings')
  const { t: tPayments } = useTranslation('payments')
  const { t: tCommon } = useTranslation('common')
  const { data: payments } = useBookingPayments(reference)
  // The agreement card's own query, so asking here costs no second request.
  const { data: contract } = useBookingContract(reference)
  const pickUp = useBookingHandover(reference, 'pickUp')
  const returnVehicle = useBookingHandover(reference, 'returnVehicle')
  const close = useBookingHandover(reference, 'close')
  // The step the form was opened for. If the booking moves on under it, the form is no
  // longer that step's: it closes rather than send a pickup's readings as a return.
  const [recording, setRecording] = useState<'pickUp' | 'returnVehicle'>()
  const [confirmingClose, setConfirmingClose] = useState(false)
  const action = payments ? handoverButton(payments.actions) : null
  if (!payments || !action) return null

  const { icon, label } = BUTTONS[action.action]
  const handover = action.action === 'pickUp' ? pickUp : returnVehicle
  const { allowed, reason } = action.rule
  const button = (
    <PageActionButton
      icon={icon}
      label={t(label)}
      variant="solid"
      disabled={!allowed || close.isPending}
      onClick={() => (action.action === 'close' ? setConfirmingClose(true) : setRecording(action.action))}
    />
  )
  if (allowed) {
    if (action.action === 'close') {
      return (
        <>
          {button}
          <ConfirmDialog
            open={confirmingClose}
            onOpenChange={setConfirmingClose}
            title={t('details.closeDialog.title')}
            description={t('details.closeDialog.description', { reference })}
            confirmLabel={t('details.actions.closeBooking')}
            cancelLabel={tCommon('actions.back')}
            confirmVariant="primary"
            loading={close.isPending}
            // Left open on a refusal, so it can be tried again without reopening it.
            onConfirm={() => close.mutate(undefined, { onSuccess: () => setConfirmingClose(false) })}
          />
        </>
      )
    }
    const step = action.action
    return (
      <>
        {button}
        <BookingConditionDialog
          open={recording === step}
          onOpenChange={(open) => setRecording(open ? step : undefined)}
          stage={step === 'pickUp' ? 'pickup' : 'return'}
          pickup={condition.pickupCondition}
          vehicleMileage={condition.vehicleMileage}
          electric={condition.vehicleElectric}
          loading={handover.isPending}
          onSubmit={(input) => handover.mutate(input, { onSuccess: () => setRecording(undefined) })}
        />
      </>
    )
  }

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
