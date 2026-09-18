import { BanknoteArrowUp, FileDown, Link2, Lock, LockOpen, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { useFormatters } from '@/i18n'
import { BookingChargeLines } from './BookingCharges'
import type { BookingChargeLine, BookingPaymentState } from '../types/booking.types'

/** Everything the counter can do to the money on a booking. */
export type PaymentAction =
  | 'sendLink'
  | 'markPaid'
  | 'downloadInvoice'
  | 'sendReceipt'
  | 'holdDeposit'
  | 'releaseDeposit'
  | 'captureDeposit'

interface BookingPaymentCardProps {
  payment: BookingPaymentState
  charges: BookingChargeLine[]
  days: number
  onAction: (action: PaymentAction) => void
}

function Line({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-fg-3 text-[13px]">{label}</span>
      <span className={`text-[13px] font-semibold tabular-nums ${muted ? 'text-fg-4' : ''}`}>{value}</span>
    </div>
  )
}

/**
 * The booking's invoice: what was quoted, what has been taken, and what is still on hold. The
 * itemization used to sit in a card of its own, which meant the total was printed twice on the
 * same page with nothing keeping the two in step.
 */
export function BookingPaymentCard({ payment, charges, days, onAction }: BookingPaymentCardProps) {
  const { t } = useTranslation('bookings')
  const format = useFormatters()

  const outstanding = payment.balance > 0
  const depositOpen = payment.depositState === 'held'

  return (
    <Card as="section" className="flex flex-col p-[18px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-panel-title m-0">{t('details.payment.title')}</h2>
        <StatusBadge status={outstanding ? 'Pending' : 'Paid'} />
      </div>
      <p className="text-fg-4 m-0 mt-0.5 text-[12px]">{t('details.charges.quotedAt', { count: days })}</p>

      <div className="border-border-soft mt-3 border-t pt-1">
        <BookingChargeLines charges={charges} days={days} />
      </div>

      <div className="border-border-soft mt-1 flex items-baseline justify-between gap-3 border-t pt-3">
        <span className="text-[13.5px] font-semibold">{t('details.charges.total')}</span>
        <span className="text-[22px] leading-none font-bold tabular-nums">{format.currency(payment.total)}</span>
      </div>
      <p className="text-fg-4 m-0 mt-1.5 text-[12px]" style={{ textWrap: 'pretty' }}>
        {outstanding
          ? t('details.payment.dueNote', { amount: format.currency(payment.balance) })
          : t('details.payment.capturedNote', {
              when: payment.capturedAt ? format.shortDate(payment.capturedAt) : '—',
              method: payment.method ?? '—',
            })}
      </p>

      {/* Only figures that differ from the total earn a line of their own. */}
      <div className="border-border-soft divide-border-soft mt-3 flex flex-col divide-y border-t pt-1">
        {outstanding && <Line label={t('details.payment.captured')} value={format.currency(payment.captured)} />}
        {payment.refunded > 0 && <Line label={t('details.payment.refunded')} value={format.currency(payment.refunded)} />}
        <Line label={t('details.payment.balance')} value={format.currency(payment.balance)} muted={!outstanding} />
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {outstanding ? (
          <>
            <Button type="button" onClick={() => onAction('sendLink')} className="w-full gap-1.5">
              <Link2 className="size-4" aria-hidden />
              {t('details.payment.sendLink')}
            </Button>
            <Button type="button" variant="outline" onClick={() => onAction('markPaid')} className="w-full gap-1.5">
              <BanknoteArrowUp className="size-4" aria-hidden />
              {t('details.payment.markPaid')}
            </Button>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => onAction('downloadInvoice')} className="gap-1.5">
              <FileDown className="size-4" aria-hidden />
              {t('details.payment.downloadInvoice')}
            </Button>
            <Button type="button" variant="outline" onClick={() => onAction('sendReceipt')} className="gap-1.5">
              <Mail className="size-4" aria-hidden />
              {t('details.payment.sendReceipt')}
            </Button>
          </div>
        )}
      </div>

      {/* A separate pot from the rental charge — authorized up front, settled at the very end. */}
      <div className="border-border-soft mt-3.5 border-t pt-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-semibold">{t('details.payment.deposit')}</span>
          <span className="text-fg-4 text-[11.5px]">{t(`details.payment.depositState.${payment.depositState}`)}</span>
        </div>
        <p className="m-0 mt-0.5 text-[15px] font-bold tabular-nums">{format.currency(payment.depositHold)}</p>

        <div className="mt-2 flex flex-wrap gap-2">
          {payment.depositState === 'pending' && (
            <Button type="button" variant="outline" size="sm" onClick={() => onAction('holdDeposit')} className="flex-1 gap-1.5">
              <Lock className="size-3.5" aria-hidden />
              {t('details.payment.holdDeposit')}
            </Button>
          )}
          {depositOpen && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onAction('releaseDeposit')}
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
                className="flex-1 gap-1.5"
              >
                <BanknoteArrowUp className="size-3.5" aria-hidden />
                {t('details.payment.captureDeposit')}
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
