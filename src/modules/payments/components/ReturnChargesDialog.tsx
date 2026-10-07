import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { focusDialogContent } from '@/components/ui/dialog-focus'
import { Input } from '@/components/ui/input'
import { useFormatters } from '@/i18n'
import { RETURN_CHARGE_NOTE_MAX } from '../constants/payment.constants'
import {
  RETURN_CHARGE_KINDS,
  type BookingPayments,
  type ReturnCharge,
  type ReturnChargeKind,
} from '../types/booking-payment.types'
import { collectedForCharges, heldDeposit, parseCharge, settlement } from '../utils/booking-payment.utils'

/** A charge worked out from the booking, offered as a starting figure the counter can change. */
export type SuggestedCharges = Partial<Record<ReturnChargeKind, { amount: number; note: string }>>

interface ReturnChargesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payments: BookingPayments
  suggested?: SuggestedCharges
  loading: boolean
  onSubmit: (charges: ReturnCharge[]) => void
}

/**
 * What a return cost beyond the rental, and what that does to the deposit: captured as far as
 * the charges go, the rest released, and anything above it left as a balance to collect.
 */
export function ReturnChargesDialog({ open, onOpenChange, ...form }: ReturnChargesDialogProps) {
  const { t } = useTranslation('payments')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] gap-5 overflow-y-auto outline-none sm:max-w-[620px]"
        onOpenAutoFocus={focusDialogContent}
      >
        <DialogHeader>
          <DialogTitle>{t('booking.charges.title')}</DialogTitle>
          <DialogDescription>{t('booking.charges.description')}</DialogDescription>
        </DialogHeader>
        {/* Mounted per opening, so it starts from the charges as they are saved now. */}
        {open && <ChargesForm {...form} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

type Rows = Record<ReturnChargeKind, { amount: string; note: string }>

function startingRows(payments: BookingPayments, suggested: SuggestedCharges): Rows {
  // Suggestions only fill a return nobody has saved: after that an empty row was a decision.
  const from = (kind: ReturnChargeKind) =>
    payments.returnChargesSaved
      ? payments.returnCharges.find((charge) => charge.kind === kind)
      : suggested[kind]
  return Object.fromEntries(
    RETURN_CHARGE_KINDS.map((kind) => {
      const charge = from(kind)
      return [kind, { amount: charge ? String(charge.amount) : '', note: charge?.note ?? '' }]
    }),
  ) as Rows
}

function ChargesForm({
  payments,
  suggested = {},
  loading,
  onSubmit,
  onCancel,
}: Omit<ReturnChargesDialogProps, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const { t } = useTranslation('payments')
  const { t: tCommon } = useTranslation('common')
  const format = useFormatters()
  const money = (amount: number) => format.currency(amount, payments.currency)
  const [rows, setRows] = useState(() => startingRows(payments, suggested))
  const [attempted, setAttempted] = useState(false)

  const amounts = RETURN_CHARGE_KINDS.map((kind) => parseCharge(rows[kind].amount))
  const invalid = amounts.some((amount) => amount === undefined)
  const total = amounts.reduce<number>((sum, amount) => sum + (amount ?? 0), 0)
  const held = heldDeposit(payments)
  const collected = collectedForCharges(payments)
  const { capture, release, due } = settlement(Math.max(0, total - collected), held)
  const set = (kind: ReturnChargeKind, change: Partial<Rows[ReturnChargeKind]>) =>
    setRows((current) => ({ ...current, [kind]: { ...current[kind], ...change } }))

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        setAttempted(true)
        if (invalid) return
        onSubmit(
          RETURN_CHARGE_KINDS.flatMap((kind, index) => {
            const amount = amounts[index] ?? 0
            return amount > 0 ? [{ kind, amount, note: rows[kind].note.trim() || undefined }] : []
          }),
        )
      }}
    >
      <div className="border-border-soft bg-surface-2 flex items-baseline justify-between gap-3 rounded-[10px] border px-3.5 py-3">
        <span className="text-fg-2 text-[13px]">
          {held > 0 ? t('booking.charges.held') : t('booking.charges.noHold')}
        </span>
        {held > 0 && <span className="text-[17px] font-bold tabular-nums">{money(held)}</span>}
      </div>

      <div className="flex flex-col gap-2.5">
        {RETURN_CHARGE_KINDS.map((kind, index) => {
          const label = t(`booking.charges.kinds.${kind}`)
          return (
            <div key={kind} className="grid items-center gap-2 sm:grid-cols-[132px_112px_minmax(0,1fr)]">
              <span className="text-label">{label}</span>
              <div className="relative">
                <span
                  aria-hidden
                  className="text-fg-3 pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[14px]"
                >
                  {format.currencySymbol(payments.currency)}
                </span>
                <Input
                  aria-label={t('booking.charges.amountOf', { kind: label })}
                  invalid={attempted && amounts[index] === undefined}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={rows[kind].amount}
                  onChange={(event) => set(kind, { amount: event.target.value })}
                  className="pl-7 tabular-nums"
                />
              </div>
              <Input
                aria-label={t('booking.charges.noteOf', { kind: label })}
                placeholder={t('booking.charges.note')}
                maxLength={RETURN_CHARGE_NOTE_MAX}
                value={rows[kind].note}
                onChange={(event) => set(kind, { note: event.target.value })}
              />
            </div>
          )
        })}
        {attempted && invalid && (
          <p role="alert" className="text-caption text-error m-0">
            {t('booking.charges.invalid')}
          </p>
        )}
      </div>

      <dl className="border-border-soft bg-surface-2 divide-border-soft m-0 flex flex-col divide-y rounded-[10px] border px-3.5 text-[13px]">
        <Sum label={t('booking.charges.total')} value={money(total)} strong />
        {collected > 0 && <Sum label={t('booking.charges.collected')} value={money(collected)} />}
        {held > 0 && <Sum label={t('booking.charges.captured')} value={money(capture)} />}
        {held > 0 && <Sum label={t('booking.charges.released')} value={money(release)} />}
        {due > 0 && <Sum label={t('booking.charges.due')} value={money(due)} strong warn />}
      </dl>
      {due > 0 && <p className="text-description m-0 -mt-2">{t('booking.charges.dueHint')}</p>}

      <DialogFooter className="mt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          {tCommon('actions.cancel')}
        </Button>
        <Button type="submit" loading={loading}>
          {held <= 0
            ? t('booking.charges.save')
            : capture > 0
              ? t('booking.charges.capture', { amount: money(capture) })
              : t('booking.charges.release')}
        </Button>
      </DialogFooter>
    </form>
  )
}

function Sum({
  label,
  value,
  strong,
  warn,
}: {
  label: string
  value: string
  strong?: boolean
  warn?: boolean
}) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-2 ${warn ? 'text-warning' : ''}`}>
      <dt className={strong ? 'font-semibold' : 'text-fg-2'}>{label}</dt>
      <dd className={`m-0 tabular-nums ${strong ? 'text-[15px] font-bold' : 'font-semibold'}`}>{value}</dd>
    </div>
  )
}
