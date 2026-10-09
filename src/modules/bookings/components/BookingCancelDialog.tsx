import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { CancellationSchedule } from '@/components/data-display/CancellationSchedule'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { useFormatters } from '@/i18n'
import { useCancellationQuote } from '@/modules/payments/hooks/use-booking-payments'
import type { CancellationQuote } from '@/modules/payments/types/booking-payment.types'
import { parseCharge } from '@/modules/payments/utils/booking-payment.utils'
import {
  hasSuggestion,
  refundPresets,
  refundSplit,
  suggestedPreset,
  type RefundChoice,
} from '@/modules/payments/utils/cancellation.utils'
import { DECLINE_MESSAGE_MAX } from '../constants/booking.constants'
import { CANCEL_REASONS, type CancelInput, type CancelReason } from '../types/booking.types'

interface BookingCancelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reference: string
  renterName: string
  /** Whether the booking can be cancelled at all: the quote is only read ahead for one that can. */
  cancellable: boolean
  loading: boolean
  onCancel: (input: CancelInput) => void
}

/**
 * Cancels a booking before pickup. It asks why, and what to refund: the booking's own policy
 * suggests an amount, and the counter decides. Everything else the cancellation undoes is listed.
 */
export function BookingCancelDialog({
  open,
  onOpenChange,
  reference,
  renterName,
  cancellable,
  ...form
}: BookingCancelDialogProps) {
  const { t } = useTranslation('bookings')
  // Read while closed, so the dialog opens at its full height: opened on a spinner, it jumped
  // when the form replaced it a moment later. The form still reads it again as it mounts.
  useCancellationQuote(reference, cancellable)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // Taller than a laptop screen once a policy and a custom amount are showing: it scrolls
        // inside itself rather than running off the top and bottom of the page.
        className="max-h-[92vh] gap-5 overflow-y-auto outline-none sm:max-w-[560px]"
        onOpenAutoFocus={focusDialogContent}
      >
        <DialogHeader>
          <DialogTitle>{t('details.cancelDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('details.cancelDialog.description', { reference, name: renterName })}
          </DialogDescription>
        </DialogHeader>
        {/* Mounted per opening: each starts from a fresh quote, and is its own cancellation. */}
        {open && (
          <CancelForm
            reference={reference}
            renterName={renterName}
            onBack={() => onOpenChange(false)}
            {...form}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

const optionClass = (selected: boolean) =>
  cn(
    'flex cursor-pointer items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-[13px] transition-colors',
    selected ? 'border-primary bg-tint font-semibold' : 'border-border hover:bg-surface-2',
  )

interface CancelFormProps extends Pick<
  BookingCancelDialogProps,
  'reference' | 'renterName' | 'loading' | 'onCancel'
> {
  onBack: () => void
}

function CancelForm({ reference, renterName, loading, onCancel, onBack }: CancelFormProps) {
  const { t } = useTranslation('bookings')
  const { t: tCommon } = useTranslation('common')
  const { data: quote, isLoading, isError, refetch } = useCancellationQuote(reference, true)
  // One id for this opening, so sending the same cancellation again cannot refund twice.
  const [requestId] = useState(() => crypto.randomUUID())
  const [reason, setReason] = useState<CancelReason>()
  const [message, setMessage] = useState('')
  // Undefined until the counter picks one: until then the suggested answer is the one selected.
  const [picked, setPicked] = useState<RefundChoice>()
  const [custom, setCustom] = useState('')
  const [attempted, setAttempted] = useState(false)

  if (isLoading) return <LoadingState className="py-10" />
  if (isError || !quote) return <ErrorState onRetry={() => void refetch()} className="py-6" />

  if (!quote.cancel.allowed) {
    return (
      <>
        <p className="bg-warning-tint m-0 rounded-[10px] px-3 py-2.5 text-[13px]">
          {quote.cancel.reason
            ? t(`details.manage.cancelOff.${quote.cancel.reason}`)
            : t('details.cancelDialog.unavailable')}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onBack}>
            {tCommon('actions.back')}
          </Button>
        </DialogFooter>
      </>
    )
  }

  const presets = refundPresets(quote)
  const suggested = suggestedPreset(quote, reason)
  const choice = picked ?? suggested
  // An emptied field is not a decision to refund nothing: "No refund" is there for that.
  const typed = custom.trim() === '' ? undefined : parseCharge(custom)
  const refund = choice === 'custom' ? typed : presets.find((preset) => preset.key === choice)?.amount
  const over = refund !== undefined && refund > quote.paid
  const split = refundSplit(quote, refund ?? 0)
  const customError =
    choice !== 'custom' || !(attempted || custom !== '')
      ? undefined
      : refund === undefined
        ? t('details.cancelDialog.refundInvalid')
        : over
          ? t('details.cancelDialog.refundOver')
          : undefined

  function confirm() {
    setAttempted(true)
    if (!reason || refund === undefined || over) return
    onCancel({ reason, message, keep: split.kept, requestId })
  }

  return (
    <>
      <FormField
        label={t('details.cancelDialog.reason')}
        error={attempted && !reason ? t('details.cancelDialog.reasonRequired') : undefined}
        required
      >
        {({ id, 'aria-describedby': describedBy }) => (
          <RadioGroup
            id={id}
            aria-label={t('details.cancelDialog.reason')}
            aria-describedby={describedBy}
            value={reason ?? ''}
            onValueChange={(next) => setReason(next as CancelReason)}
            className="sm:grid-cols-2"
          >
            {CANCEL_REASONS.map((option) => (
              <label key={option} className={optionClass(reason === option)}>
                <RadioGroupItem value={option} />
                {t(`details.cancelled.reasons.${option}`)}
              </label>
            ))}
          </RadioGroup>
        )}
      </FormField>

      {quote.paid > 0 ? (
        <RefundChoices
          quote={quote}
          choice={choice}
          // Marked only when something stands behind it: the policy, or the company's own fault.
          suggested={hasSuggestion(quote, reason) ? suggested : undefined}
          onChoose={setPicked}
          custom={custom}
          onCustomChange={setCustom}
          customError={customError}
        />
      ) : (
        <p className="text-fg-3 m-0 text-[13px]">{t('details.cancelDialog.nothingPaid')}</p>
      )}

      <Consequences quote={quote} split={split} renterName={renterName} />

      <FormField
        label={t('details.cancelDialog.message')}
        description={
          quote.emailsRenter
            ? t('details.cancelDialog.messageHint')
            : t('details.cancelDialog.messageHintNoEmail')
        }
      >
        {(fieldProps) => (
          <Textarea
            rows={2}
            maxLength={DECLINE_MESSAGE_MAX}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            {...fieldProps}
          />
        )}
      </FormField>

      <DialogFooter>
        <Button variant="outline" onClick={onBack} disabled={loading}>
          {tCommon('actions.back')}
        </Button>
        <Button variant="destructive" onClick={confirm} loading={loading}>
          {t('details.cancelDialog.confirm')}
        </Button>
      </DialogFooter>
    </>
  )
}

interface RefundChoicesProps {
  quote: CancellationQuote
  choice: RefundChoice
  /** The answer to mark as suggested; none when the starting one is only a default. */
  suggested?: RefundChoice
  onChoose: (choice: RefundChoice) => void
  custom: string
  onCustomChange: (value: string) => void
  customError?: string
}

/**
 * What was paid, what the booking's policy says, and the answers to how much goes back: each
 * with its amount, so the counter picks an outcome rather than working one out.
 */
function RefundChoices({
  quote,
  choice,
  suggested,
  onChoose,
  custom,
  onCustomChange,
  customError,
}: RefundChoicesProps) {
  const { t } = useTranslation('bookings')
  const format = useFormatters()
  const money = (amount: number) => format.currency(amount, quote.currency)
  const hintId = useId()
  const presets = refundPresets(quote)
  // Three answers share a line. With the policy's own as a fourth, none would have room.
  const threeAcross = presets.length === 2

  return (
    <div className="flex flex-col gap-3">
      <div className="border-border-soft bg-surface-2 flex items-baseline justify-between gap-3 rounded-[10px] border px-3.5 py-3">
        <span className="text-fg-2 text-[13px]">{t('details.cancelDialog.paid')}</span>
        <span className="text-[17px] font-bold tabular-nums">{money(quote.paid)}</span>
      </div>

      {quote.policy ? (
        <>
          <CancellationSchedule policy={quote.policy} />
          <p className="m-0 text-[13px]">
            {quote.policy.length === 0
              ? t('details.cancelDialog.policyNonRefundable')
              : t('details.cancelDialog.policyNow', {
                  percent: quote.refundPercent ?? 0,
                  amount: money(quote.policyRefund ?? 0),
                })}
          </p>
        </>
      ) : (
        <p className="text-fg-3 m-0 text-[13px]">{t('details.cancelDialog.noPolicy')}</p>
      )}

      <FormField label={t('details.cancelDialog.refund')}>
        {({ id }) => (
          <RadioGroup
            id={id}
            aria-label={t('details.cancelDialog.refund')}
            value={choice}
            onValueChange={(next) => onChoose(next as RefundChoice)}
            className={threeAcross ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}
          >
            {presets.map(({ key, amount }) => (
              <label key={key} className={optionClass(choice === key)}>
                <RadioGroupItem value={key} />
                {/* Stacked when three across: a label and its amount do not fit one line there. */}
                <span
                  className={cn(
                    'flex min-w-0 flex-1',
                    threeAcross ? 'flex-col gap-0.5' : 'items-center gap-2',
                  )}
                >
                  <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
                    {key === 'policy'
                      ? t('details.cancelDialog.options.policy', { percent: quote.refundPercent ?? 0 })
                      : t(`details.cancelDialog.options.${key}`)}
                    {/* Not three across: there the badge wraps and makes its answer a line taller. */}
                    {suggested === key && !threeAcross && (
                      <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-px text-[10.5px] font-semibold">
                        {t('details.cancelDialog.suggested')}
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 tabular-nums',
                      threeAcross && 'text-fg-3 text-[12px] font-normal',
                    )}
                  >
                    {money(amount)}
                  </span>
                </span>
              </label>
            ))}
            <label className={optionClass(choice === 'custom')}>
              <RadioGroupItem value="custom" />
              {t('details.cancelDialog.options.custom')}
            </label>
          </RadioGroup>
        )}
      </FormField>

      {choice === 'custom' && (
        // The limit, or what is wrong, sits beside the field: under it, the amount cost three lines.
        <div className="flex items-center gap-3">
          <div className="relative w-40 shrink-0">
            <span
              aria-hidden
              className="text-fg-3 pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[14px]"
            >
              {format.currencySymbol(quote.currency)}
            </span>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              aria-label={t('details.cancelDialog.customAmount')}
              aria-invalid={customError ? true : undefined}
              aria-describedby={hintId}
              value={custom}
              onChange={(event) => onCustomChange(event.target.value)}
              className="pl-7 tabular-nums"
            />
          </div>
          {customError ? (
            <p id={hintId} role="alert" className="text-caption text-error m-0">
              {customError}
            </p>
          ) : (
            <p id={hintId} className="text-description m-0">
              {t('details.cancelDialog.refundHint', { max: money(quote.paid) })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

interface ConsequencesProps {
  quote: CancellationQuote
  split: ReturnType<typeof refundSplit>
  renterName: string
}

/** Everything the cancellation does besides freeing the dates, so none of it is a surprise. */
function Consequences({ quote, split, renterName }: ConsequencesProps) {
  const { t } = useTranslation('bookings')
  const format = useFormatters()
  const money = (amount: number) => format.currency(amount, quote.currency)
  const lines = [
    split.toCard > 0 && t('details.cancelDialog.effects.toCard', { amount: money(split.toCard) }),
    split.byHand > 0 && t('details.cancelDialog.effects.byHand', { amount: money(split.byHand) }),
    split.kept > 0 && t('details.cancelDialog.effects.kept', { amount: money(split.kept) }),
    quote.depositHeld > 0 && t('details.cancelDialog.effects.deposit', { amount: money(quote.depositHeld) }),
    quote.withdrawsLink && t('details.cancelDialog.effects.link'),
    // Said either way: a counter expecting an email must not find out later that none went.
    quote.emailsRenter
      ? t('details.cancelDialog.effects.email', { name: renterName })
      : t('details.cancelDialog.effects.noEmail', { name: renterName }),
  ].filter((line): line is string => Boolean(line))

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-fg-3 m-0 text-[11px] font-semibold tracking-wide uppercase">
        {t('details.cancelDialog.effects.title')}
      </p>
      <ul
        aria-label={t('details.cancelDialog.effects.title')}
        className="m-0 flex list-disc flex-col gap-1 pl-5 text-[13px]"
      >
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  )
}
