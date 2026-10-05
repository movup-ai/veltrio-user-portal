import { BanknoteArrowUp, FileDown, Link2, Lock, LockOpen, Mail, Undo2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { useFormatters } from '@/i18n'
import { DEPOSIT_STATUS_BADGE, PAYMENT_STATE_BADGE } from '@/modules/payments/constants/payment.constants'
import type {
  BookingPaymentRecord,
  BookingPayments,
  PaymentActionRule,
} from '@/modules/payments/types/booking-payment.types'
import {
  depositStatus,
  paymentBadge,
  refundablePayments,
  rentalHistory,
} from '@/modules/payments/utils/booking-payment.utils'
import { BookingChargeLines } from './BookingCharges'
import type { BookingChargeLine } from '../types/booking.types'
import { isBeforePickup } from '../utils/booking.handover'

/** Everything the counter can do to the money on a booking. */
export type PaymentAction =
  | 'sendLink'
  | 'markPaid'
  | 'downloadInvoice'
  | 'sendReceipt'
  | 'requestDeposit'
  | 'releaseDeposit'
  | 'captureDeposit'
  | 'refund'

interface BookingPaymentCardProps {
  payments: BookingPayments
  charges: BookingChargeLine[]
  days: number
  canRefund: boolean
  /** Actions that run straight from the card, so their buttons show the wait. */
  busy: {
    sendLink: boolean
    requestDeposit: boolean
    releaseDeposit: boolean
    downloadInvoice: boolean
    sendReceipt: boolean
  }
  onAction: (action: PaymentAction) => void
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-fg-3 text-[13px]">{label}</span>
      <span className="text-[13px] font-semibold tabular-nums">{value}</span>
    </div>
  )
}

/** Why a button is off, under it; nothing for one that is on. */
function Hint({ rule, fallback }: { rule: PaymentActionRule; fallback?: string }) {
  const { t } = useTranslation('payments')
  const text = rule.allowed ? fallback : rule.reason ? t(`booking.reasons.${rule.reason}`) : fallback
  return text ? <p className="text-fg-4 m-0 text-[12px]">{text}</p> : null
}

/**
 * The booking's invoice: what was quoted, what has been taken, and what is on hold, as the API
 * records it. The itemization lives here too, so the total is printed once.
 */
export function BookingPaymentCard({
  payments,
  charges,
  days,
  canRefund,
  busy,
  onAction,
}: BookingPaymentCardProps) {
  const { t } = useTranslation('bookings')
  const format = useFormatters()
  const money = (amount: number) => format.currency(amount, payments.currency)
  const { actions } = payments
  const badge = paymentBadge(payments)

  const outstanding = payments.balance > 0
  const partlyPaid = outstanding && payments.paid > 0
  const rental = rentalHistory(payments.payments)
  const latest = rental.find((p) => p.status === 'succeeded')

  return (
    <Card as="section" className="flex flex-col p-[18px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-panel-title m-0">{t('details.payment.title')}</h2>
        <StatusBadge status={PAYMENT_STATE_BADGE[badge]} label={t(`details.payment.state.${badge}`)} />
      </div>
      <p className="text-fg-4 m-0 mt-0.5 text-[12px]">{t('details.charges.quotedAt', { count: days })}</p>

      <div className="border-border-soft mt-3 border-t pt-1">
        <BookingChargeLines charges={charges} days={days} currency={payments.currency} />
      </div>

      <div className="border-border-soft mt-1 flex items-baseline justify-between gap-3 border-t pt-3">
        <span className="text-[13.5px] font-semibold">{t('details.charges.total')}</span>
        <span className="text-[22px] leading-none font-bold tabular-nums">{money(payments.total)}</span>
      </div>
      <p className="text-fg-4 m-0 mt-1.5 text-[12px]" style={{ textWrap: 'pretty' }}>
        {outstanding
          ? t('details.payment.dueNote', { amount: money(payments.balance) })
          : t('details.payment.capturedNote', {
              when: latest?.completedAt ? format.shortDate(latest.completedAt) : '—',
              method: latest?.method ?? '—',
            })}
      </p>

      {/* Only figures the note above does not already give earn a line: a part payment and
          what it leaves, and refunds. Paid in full, the balance is just $0. */}
      {(partlyPaid || payments.refunded > 0) && (
        <div className="border-border-soft divide-border-soft mt-3 flex flex-col divide-y border-t pt-1">
          {partlyPaid && <Line label={t('details.payment.paid')} value={money(payments.paid)} />}
          {payments.refunded > 0 && (
            <Line label={t('details.payment.refunded')} value={money(payments.refunded)} />
          )}
          {partlyPaid && <Line label={t('details.payment.balance')} value={money(payments.balance)} />}
        </div>
      )}

      {rental.length > 0 && <PaymentHistory payments={rental} currency={payments.currency} />}

      <div className="mt-3 flex flex-col gap-2">
        {outstanding && (
          <>
            <Button
              type="button"
              onClick={() => onAction('sendLink')}
              loading={busy.sendLink}
              disabled={!actions.sendLink.allowed}
              className="w-full gap-1.5"
            >
              <Link2 className="size-4" aria-hidden />
              {actions.linkIncludesDeposit
                ? t('details.payment.sendLinkWithDeposit')
                : payments.openLink
                  ? t('details.payment.resendLink')
                  : t('details.payment.sendLink')}
            </Button>
            <Hint rule={actions.sendLink} />
            <Button
              type="button"
              variant="outline"
              onClick={() => onAction('markPaid')}
              disabled={!actions.markPaid.allowed}
              className="w-full gap-1.5"
            >
              <BanknoteArrowUp className="size-4" aria-hidden />
              {t('details.payment.markPaid')}
            </Button>
          </>
        )}
        {/* Both wait for money: until something is paid, the payment link is what the renter gets. */}
        {payments.paid > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onAction('downloadInvoice')}
              loading={busy.downloadInvoice}
              className="gap-1.5"
            >
              <FileDown className="size-4" aria-hidden />
              {t('details.payment.downloadInvoice')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onAction('sendReceipt')}
              loading={busy.sendReceipt}
              className="gap-1.5"
            >
              <Mail className="size-4" aria-hidden />
              {t('details.payment.sendReceipt')}
            </Button>
          </div>
        )}
        {canRefund && refundablePayments(payments.payments).length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onAction('refund')}
            className="w-full gap-1.5"
          >
            <Undo2 className="size-4" aria-hidden />
            {t('details.payment.refund')}
          </Button>
        )}
      </div>

      {payments.depositAmount > 0 && (
        <DepositSection payments={payments} busy={busy} onAction={onAction} money={money} />
      )}
    </Card>
  )
}

function PaymentHistory({ payments, currency }: { payments: BookingPaymentRecord[]; currency: string }) {
  const { t } = useTranslation('bookings')
  const { t: tPayments } = useTranslation('payments')
  const format = useFormatters()

  return (
    <div className="border-border-soft mt-3 border-t pt-2.5">
      <p className="text-fg-3 m-0 text-[12px] font-semibold">{t('details.payment.history')}</p>
      <ul className="m-0 mt-1 flex list-none flex-col gap-1 p-0">
        {payments.map((payment) => (
          <li key={payment.id} className="flex items-center justify-between gap-3 text-[12.5px]">
            <span className="text-fg-2 min-w-0 truncate">
              {payment.method ?? tPayments(`booking.kind.${payment.kind}`)}
              <span className="text-fg-4"> · {tPayments(`booking.status.${payment.status}`)}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums">
              {format.currency(payment.status === 'succeeded' ? payment.captured : payment.amount, currency)}
              {payment.refunded > 0 && (
                <span className="text-fg-4 font-normal">
                  {' '}
                  (−{format.currency(payment.refunded, currency)})
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * A separate pot from the rental: authorised by the renter, from the day before pickup, and
 * captured or released once the car is back.
 */
function DepositSection({
  payments,
  busy,
  onAction,
  money,
}: Pick<BookingPaymentCardProps, 'payments' | 'busy' | 'onAction'> & { money: (amount: number) => string }) {
  const { t } = useTranslation('bookings')
  const format = useFormatters()
  const { actions, deposit } = payments
  const state = deposit?.status
  const status = depositStatus(payments)
  const detail =
    status === 'held' && deposit?.captureBefore
      ? t('details.payment.heldUntil', { date: format.shortDate(deposit.captureBefore) })
      : status === 'captured'
        ? t('details.payment.capturedAmount', { amount: money(deposit?.captured ?? 0) })
        : undefined
  // Asked for until a hold is in place; gone once there is nothing left to ask for.
  const settledOrClosed = ['booking_returned', 'booking_cancelled', 'no_deposit'] as const
  const showRequest =
    state !== 'held' && !settledOrClosed.some((reason) => reason === actions.requestDeposit.reason)
  // The next step once the rental is settled, so it leads; until then the payment link does.
  const requestLeads = actions.requestDeposit.allowed && payments.balance <= 0

  return (
    <div className="border-border-soft mt-3.5 border-t pt-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold">{t('details.payment.deposit')}</span>
        <StatusBadge
          status={DEPOSIT_STATUS_BADGE[status]}
          label={t(`details.payment.depositState.${status}`)}
          icon={status === 'held' ? Lock : undefined}
        />
      </div>
      <p className="m-0 mt-0.5 text-[15px] font-bold tabular-nums">
        {money(deposit?.amount ?? payments.depositAmount)}
      </p>
      {detail && <p className="text-fg-4 m-0 text-[12px]">{detail}</p>}

      {showRequest && (
        <div className="mt-2 flex flex-col gap-1.5">
          <Button
            type="button"
            variant={requestLeads ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onAction('requestDeposit')}
            loading={busy.requestDeposit}
            disabled={!actions.requestDeposit.allowed}
            className="w-full gap-1.5"
          >
            <Lock className="size-3.5" aria-hidden />
            {payments.depositRequested
              ? t('details.payment.resendDeposit')
              : t('details.payment.requestDeposit')}
          </Button>
          <Hint
            rule={actions.requestDeposit}
            // Card holds lapse in about a week, so when to ask matters until the car goes out.
            fallback={
              payments.depositRequested
                ? t('details.payment.holdStarts')
                : isBeforePickup(actions)
                  ? t('details.payment.holdTiming')
                  : undefined
            }
          />
        </div>
      )}
      {state === 'held' && (
        <div className="mt-2 flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAction('releaseDeposit')}
              loading={busy.releaseDeposit}
              disabled={!actions.releaseDeposit.allowed}
              className="flex-1 gap-1.5"
            >
              <LockOpen className="size-3.5" aria-hidden />
              {t('details.payment.releaseDeposit')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAction('captureDeposit')}
              disabled={!actions.captureDeposit.allowed}
              className="flex-1 gap-1.5"
            >
              <BanknoteArrowUp className="size-3.5" aria-hidden />
              {t('details.payment.captureDeposit')}
            </Button>
          </div>
          <Hint rule={actions.captureDeposit} />
        </div>
      )}
    </div>
  )
}
