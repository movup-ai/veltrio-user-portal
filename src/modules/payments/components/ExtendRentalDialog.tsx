import { useState, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { focusDialogContent } from '@/components/ui/dialog-focus'
import { Skeleton } from '@/components/ui/skeleton'
import { TimePicker } from '@/components/ui/time-picker'
import { useFormatters } from '@/i18n'
import { BOOKING_TIME_STEP_MINUTES } from '@/modules/bookings/constants/booking.constants'
import { normalizeApiError } from '@/services/api/errors'
import { useBookingPayments } from '../hooks/use-booking-payments'
import { useExtensionQuote, useRequestExtension } from '../hooks/use-booking-extensions'
import type { BookingExtensions, ExtensionQuote } from '../types/booking-extension.types'
import {
  addedTime,
  chosenReturn,
  extensionError,
  extensionWarnings,
  returnDayBounds,
  returnProblem,
  suggestedReturn,
} from '../utils/booking-extension.utils'

interface ExtendRentalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reference: string
  renterName: string
  /** When the car is due back now. */
  returnAt: string
  /** Before pickup an extension takes effect at once, and replaces the agreement. */
  pickedUp: boolean
  extensions: BookingExtensions
  /** The last day the renter's verified insurance stands, as `YYYY-MM-DD`. */
  coverValidUntil?: string
  /** With what the booking's extensions are once the request is in, such as a link to send. */
  onRequested: (extensions: BookingExtensions) => void
}

/** A later return: pick the time, see what it adds, and ask for it at that price. */
export function ExtendRentalDialog({ open, onOpenChange, ...form }: ExtendRentalDialogProps) {
  const { t } = useTranslation('payments')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] gap-5 overflow-y-auto outline-none sm:max-w-[520px]"
        onOpenAutoFocus={focusDialogContent}
      >
        <DialogHeader>
          <DialogTitle>{t('extension.title')}</DialogTitle>
          <DialogDescription>{t('extension.description')}</DialogDescription>
        </DialogHeader>
        {/* Mounted per opening, so it starts from the return time as it is now. */}
        {open && <ExtendForm {...form} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function ExtendForm({
  reference,
  renterName,
  returnAt,
  pickedUp,
  extensions,
  coverValidUntil,
  onRequested,
  onClose,
}: Omit<ExtendRentalDialogProps, 'open' | 'onOpenChange'> & { onClose: () => void }) {
  const { t } = useTranslation('payments')
  const { t: tCommon } = useTranslation('common')
  const format = useFormatters()
  const { availableUntil } = extensions
  // Read once: the suggestion and the earliest day must not shift under a dialog left open.
  const [now] = useState(() => new Date())
  const [choice, setChoice] = useState(() => suggestedReturn(returnAt, now, availableUntil))
  const chosen = chosenReturn(choice)
  const problem = chosen && returnProblem(chosen, returnAt, availableUntil, now)
  const quote = useExtensionQuote(reference, chosen && !problem ? chosen.toISOString() : undefined)
  const { data: payments } = useBookingPayments(reference)
  const request = useRequestExtension(reference)
  const bounds = returnDayBounds(returnAt, availableUntil, now)
  const warnings = chosen && !problem ? extensionWarnings(chosen, payments?.deposit, coverValidUntil) : []
  const refused = request.error ?? quote.error
  const refusal = refused && extensionError(refused)

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!quote.data) return
        request.mutate(
          { returnAt: quote.data.returnAt, amount: quote.data.amount },
          {
            onSuccess: (made) => {
              onClose()
              onRequested(made)
            },
          },
        )
      }}
    >
      <dl className="border-border-soft bg-surface-2 divide-border-soft m-0 flex flex-col divide-y rounded-[10px] border px-3.5">
        <Line label={t('extension.currentReturn')} value={format.dateTime(returnAt)} />
        {availableUntil && (
          <Line label={t('extension.availableUntil')} value={format.dateTime(availableUntil)} />
        )}
      </dl>

      <div className="grid grid-cols-[1fr_140px] gap-3">
        <FormField label={t('extension.newDate')}>
          {({ id, invalid }) => (
            <DatePicker
              id={id}
              value={choice.date}
              min={bounds.min}
              max={bounds.max}
              invalid={invalid || Boolean(problem)}
              onChange={(date) => {
                request.reset()
                setChoice({ ...choice, date })
              }}
            />
          )}
        </FormField>
        <FormField label={t('extension.newTime')}>
          {({ id, invalid }) => (
            <TimePicker
              id={id}
              value={choice.time}
              minuteStep={BOOKING_TIME_STEP_MINUTES}
              invalid={invalid || Boolean(problem)}
              onChange={(time) => {
                request.reset()
                setChoice({ ...choice, time })
              }}
            />
          )}
        </FormField>
      </div>

      {problem && (
        <p role="alert" className="text-caption text-error m-0">
          {t(`extension.problems.${problem}`, {
            when: availableUntil ? format.dateTime(availableUntil) : '',
          })}
        </p>
      )}
      {!problem && refused && (
        <p role="alert" className="text-caption text-error m-0">
          {refusal ? t(`extension.errors.${refusal}`) : normalizeApiError(refused).message}
        </p>
      )}
      {/* Drawn before the price arrives, with its figures still to come: the dialog opens at
          its full height instead of growing when the quote lands. */}
      {chosen && !problem && !quote.error && (
        <QuoteSummary
          quote={quote.data}
          returnAt={returnAt}
          chosen={chosen}
          pickedUp={pickedUp}
          renterName={renterName}
          dimmed={quote.isFetching && Boolean(quote.data)}
        />
      )}

      {warnings.length > 0 && (
        <ul className="bg-warning-tint border-warning/25 m-0 flex list-none flex-col gap-1.5 rounded-[10px] border px-3 py-2.5">
          {warnings.map((warning) => (
            <li key={warning} className="text-fg-2 flex items-start gap-2 text-[12.5px]">
              <AlertTriangle className="text-warning mt-0.5 size-3.5 shrink-0" aria-hidden />
              {t(`extension.warnings.${warning}`, {
                when:
                  warning === 'depositLapses'
                    ? format.dateTime(payments?.deposit?.captureBefore ?? '')
                    : format.date(`${coverValidUntil}T00:00:00`, { dateStyle: 'medium' }),
              })}
            </li>
          ))}
        </ul>
      )}

      <DialogFooter className="mt-1">
        <Button type="button" variant="outline" onClick={onClose} disabled={request.isPending}>
          {tCommon('actions.cancel')}
        </Button>
        <Button
          type="submit"
          disabled={!quote.data || Boolean(problem) || quote.isFetching}
          loading={request.isPending}
        >
          {/* Before the quote says, the likely answer: with the car out it is paid for first. */}
          {t(`extension.submit.${(quote.data?.payFirst ?? pickedUp) ? 'request' : 'extend'}`)}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Stands in for a figure the quote has not brought yet, on the same line it will sit on. */
function Pending({ wide }: { wide?: boolean }) {
  return (
    <Skeleton
      className={wide ? 'inline-block h-[1em] w-28 align-middle' : 'inline-block h-[1em] w-14 align-middle'}
    />
  )
}

function QuoteSummary({
  quote,
  returnAt,
  chosen,
  pickedUp,
  renterName,
  dimmed,
}: {
  /** Absent while the first price is on its way: the rows are there, their figures are not. */
  quote: ExtensionQuote | undefined
  returnAt: string
  chosen: Date
  pickedUp: boolean
  renterName: string
  dimmed: boolean
}) {
  const { t } = useTranslation('payments')
  const { t: tBookings } = useTranslation('bookings')
  const format = useFormatters()
  const { days, hours } = addedTime(returnAt, chosen.toISOString())
  const added = [
    days > 0 && tBookings('details.return.days', { count: days }),
    hours > 0 && tBookings('details.return.hours', { count: hours }),
  ]
    .filter(Boolean)
    .join(' ')
  // Before pickup the note does not depend on the price, so it need not wait for it.
  const note = quote
    ? quote.payFirst
      ? 'payFirst'
      : pickedUp
        ? 'free'
        : 'beforePickup'
    : !pickedUp && 'beforePickup'

  return (
    <div className={dimmed ? 'opacity-60 transition-opacity' : 'transition-opacity'} aria-busy={!quote}>
      <dl className="border-border-soft divide-border-soft m-0 flex flex-col divide-y rounded-[10px] border px-3.5">
        <Line label={t('extension.quote.added')} value={added} />
        <Line
          label={t('extension.quote.rates')}
          value={
            quote ? (
              quote.lines
                .map((line) => t('extension.quote.line', { label: line.label, count: line.count }))
                .join(' + ')
            ) : (
              <Pending wide />
            )
          }
        />
        <Line
          label={t('extension.quote.currentTotal')}
          value={quote ? format.currency(quote.previousTotal) : <Pending />}
        />
        <Line
          label={t('extension.quote.newTotal')}
          value={quote ? format.currency(quote.total) : <Pending />}
        />
        <Line
          strong
          label={t('extension.quote.amount')}
          value={
            !quote ? (
              <Pending />
            ) : quote.amount > 0 ? (
              format.currency(quote.amount)
            ) : (
              t('extension.quote.free')
            )
          }
        />
      </dl>
      {/* Two lines tall whatever it says, so the shortest note does not pull the buttons up. */}
      <p className="text-fg-4 m-0 mt-2.5 min-h-9 text-[12px]" style={{ textWrap: 'pretty' }}>
        {note ? t(`extension.notes.${note}`, { name: renterName }) : <Pending wide />}
      </p>
    </div>
  )
}

function Line({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <dt className="text-fg-2 text-[13px]">{label}</dt>
      <dd
        className={
          strong ? 'm-0 text-[15px] font-bold tabular-nums' : 'm-0 text-right text-[13px] tabular-nums'
        }
      >
        {value}
      </dd>
    </div>
  )
}
