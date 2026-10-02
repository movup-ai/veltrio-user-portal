import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormField } from '@/components/forms/FormField'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFormatters } from '@/i18n'
import { MANUAL_METHODS, type ManualMethod } from '../constants/payment.constants'
import type { BookingPaymentRecord, BookingPayments } from '../types/booking-payment.types'
import { refundableAmount, refundablePayments } from '../utils/booking-payment.utils'
import { PaymentAmountDialog } from './PaymentAmountDialog'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payments: BookingPayments
  loading: boolean
}

/** Cash or a transfer taken at the counter: recorded, nothing charged. */
export function ManualPaymentDialog({
  onSubmit,
  ...props
}: DialogProps & { onSubmit: (amount: number, method: string) => void }) {
  const { t } = useTranslation('payments')
  const format = useFormatters()
  const [method, setMethod] = useState<ManualMethod>('cash')

  return (
    <PaymentAmountDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={t('booking.manual.title')}
      description={t('booking.manual.description')}
      summaryLabel={t('booking.manual.balance')}
      amountLabel={t('booking.manual.amount')}
      amountHint={t('booking.manual.hint', {
        max: format.currency(props.payments.balance, props.payments.currency),
      })}
      submitLabel={t('booking.manual.submit')}
      max={props.payments.balance}
      defaultAmount={props.payments.balance}
      currency={props.payments.currency}
      loading={props.loading}
      // Stored in the counter's own words, so the history reads as they would say it.
      onSubmit={(amount) => onSubmit(amount, t(`booking.manual.methods.${method}`))}
    >
      <FormField label={t('booking.manual.method')}>
        {({ id }) => (
          <Select value={method} onValueChange={(value) => setMethod(value as ManualMethod)}>
            <SelectTrigger id={id}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MANUAL_METHODS.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`booking.manual.methods.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>
    </PaymentAmountDialog>
  )
}

/** Take part or all of the held deposit; the rest goes back to the renter. */
export function DepositCaptureDialog({
  onSubmit,
  ...props
}: DialogProps & { onSubmit: (amount: number) => void }) {
  const { t } = useTranslation('payments')
  const format = useFormatters()
  const held = props.payments.deposit?.amount ?? 0

  return (
    <PaymentAmountDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={t('booking.capture.title')}
      description={t('booking.capture.description', { held: format.currency(held, props.payments.currency) })}
      summaryLabel={t('booking.capture.held')}
      amountLabel={t('booking.capture.amount')}
      amountHint={t('booking.capture.hint', { max: format.currency(held, props.payments.currency) })}
      submitLabel={t('booking.capture.submit')}
      max={held}
      defaultAmount={held}
      currency={props.payments.currency}
      loading={props.loading}
      onSubmit={onSubmit}
    />
  )
}

/** Give money back on one payment, up to what is left of it. */
export function RefundDialog({
  onSubmit,
  ...props
}: DialogProps & { onSubmit: (payment: BookingPaymentRecord, amount: number) => void }) {
  const { t } = useTranslation('payments')
  const format = useFormatters()
  const options = refundablePayments(props.payments.payments)
  const [chosenId, setChosenId] = useState<string | undefined>(undefined)
  const chosen = options.find((p) => p.id === chosenId) ?? options[0]
  if (!chosen) return null
  const left = refundableAmount(chosen)

  return (
    <PaymentAmountDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={t('booking.refund.title')}
      description={t('booking.refund.description')}
      summaryLabel={t('booking.refund.left')}
      amountLabel={t('booking.refund.amount')}
      amountHint={t('booking.refund.hint', { max: format.currency(left, chosen.currency) })}
      submitLabel={t('booking.refund.submit')}
      max={left}
      defaultAmount={left}
      currency={chosen.currency}
      loading={props.loading}
      onSubmit={(amount) => onSubmit(chosen, amount)}
    >
      <FormField label={t('booking.refund.payment')}>
        {({ id }) => (
          <Select value={chosen.id} onValueChange={setChosenId}>
            <SelectTrigger id={id}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((payment) => (
                <SelectItem key={payment.id} value={payment.id}>
                  {[
                    payment.method ?? t(`booking.kind.${payment.kind}`),
                    format.currency(refundableAmount(payment), payment.currency),
                    payment.completedAt && format.shortDate(payment.completedAt),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>
    </PaymentAmountDialog>
  )
}
