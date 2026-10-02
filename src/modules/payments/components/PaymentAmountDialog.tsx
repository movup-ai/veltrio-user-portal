import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { FormField } from '@/components/forms/FormField'
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
import { checkAmount } from '../utils/booking-payment.utils'

interface PaymentAmountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  /** What the amount is drawn from, shown first: "Balance due", "Deposit held", ... */
  summaryLabel: string
  amountLabel: string
  /** Under the amount: what it may be, in this action's words. */
  amountHint: string
  submitLabel: string
  /** The most the amount may be: the balance, the deposit held, what is left to refund. */
  max: number
  defaultAmount: number
  currency: string
  loading: boolean
  onSubmit: (amount: number) => void
  /** Fields above the amount: how it was paid, which payment to refund. */
  children?: ReactNode
}

/** An amount, capped, and a confirm: what recording, capturing and refunding all come down to. */
export function PaymentAmountDialog({
  open,
  onOpenChange,
  title,
  description,
  summaryLabel,
  ...form
}: PaymentAmountDialogProps) {
  const format = useFormatters()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 outline-none sm:max-w-[520px]" onOpenAutoFocus={focusDialogContent}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="border-border-soft bg-surface-2 flex items-baseline justify-between gap-3 rounded-[10px] border px-3.5 py-3">
          <span className="text-fg-2 text-[13px]">{summaryLabel}</span>
          <span className="text-[17px] font-bold tabular-nums">
            {format.currency(form.max, form.currency)}
          </span>
        </div>
        {/* Mounted per opening, so the amount starts from the current figure each time. */}
        {open && <AmountForm {...form} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function AmountForm({
  amountLabel,
  amountHint,
  submitLabel,
  max,
  defaultAmount,
  currency,
  loading,
  onSubmit,
  onCancel,
  children,
}: Omit<PaymentAmountDialogProps, 'open' | 'onOpenChange' | 'title' | 'description' | 'summaryLabel'> & {
  onCancel: () => void
}) {
  const { t } = useTranslation('payments')
  const { t: tCommon } = useTranslation('common')
  const format = useFormatters()
  const [value, setValue] = useState(String(defaultAmount))
  const [touched, setTouched] = useState(false)
  // Follows the figure, such as another payment's refundable amount, until the counter types their
  // own; from then on it is theirs, and only checked against the new limit.
  const [typed, setTyped] = useState(false)
  const [shownDefault, setShownDefault] = useState(defaultAmount)
  if (!typed && defaultAmount !== shownDefault) {
    setShownDefault(defaultAmount)
    setValue(String(defaultAmount))
  }
  const check = checkAmount(value, max)
  const error =
    touched && 'error' in check
      ? check.error === 'over'
        ? t('booking.amountOver', { max: format.currency(max, currency) })
        : t('booking.amountInvalid')
      : undefined

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        setTouched(true)
        if ('amount' in check) onSubmit(check.amount)
      }}
    >
      {children}
      <FormField label={amountLabel} error={error} description={amountHint}>
        {(field) => (
          <div className="relative">
            <span
              aria-hidden
              className="text-fg-3 pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[14px]"
            >
              {format.currencySymbol(currency)}
            </span>
            <Input
              {...field}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={value}
              onChange={(event) => {
                setTyped(true)
                setValue(event.target.value)
              }}
              onBlur={() => setTouched(true)}
              className="pl-7 tabular-nums"
            />
          </div>
        )}
      </FormField>
      <DialogFooter className="mt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          {tCommon('actions.cancel')}
        </Button>
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}
