import { useState } from 'react'
import { Link2Off } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { DECLINE_MESSAGE_MAX } from '../constants/booking.constants'
import { DECLINE_REASONS, type DeclineInput, type DeclineReason } from '../types/booking.types'

interface BookingDeclineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reference: string
  renterName: string
  /** A payment or deposit link is out: declining withdraws it, so the dialog says so first. */
  withdrawsLink: boolean
  loading: boolean
  onDecline: (input: DeclineInput) => void
}

/** Asks why before a reservation is turned down: the renter is emailed the reason and the message. */
export function BookingDeclineDialog({
  open,
  onOpenChange,
  reference,
  renterName,
  withdrawsLink,
  loading,
  onDecline,
}: BookingDeclineDialogProps) {
  const { t } = useTranslation('bookings')
  const { t: tCommon } = useTranslation('common')
  const [reason, setReason] = useState<DeclineReason>()
  const [message, setMessage] = useState('')
  const [attempted, setAttempted] = useState(false)

  // Closing clears it, declined or not: an abandoned attempt must not greet the next one.
  function close() {
    setReason(undefined)
    setMessage('')
    setAttempted(false)
    onOpenChange(false)
  }

  function confirm() {
    setAttempted(true)
    if (reason) onDecline({ reason, message })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="gap-5 outline-none" onOpenAutoFocus={focusDialogContent}>
        <DialogHeader>
          <DialogTitle>{t('details.declineDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('details.declineDialog.description', { reference, name: renterName })}
          </DialogDescription>
        </DialogHeader>

        {withdrawsLink && (
          <p className="bg-warning-tint m-0 flex items-start gap-2 rounded-[10px] px-3 py-2.5 text-[12.5px]">
            <Link2Off className="text-warning mt-px size-3.5 shrink-0" aria-hidden />
            {t('details.declineDialog.withdrawsLink')}
          </p>
        )}

        <FormField
          label={t('details.declineDialog.reason')}
          error={attempted && !reason ? t('details.declineDialog.reasonRequired') : undefined}
          required
        >
          {({ id, 'aria-describedby': describedBy }) => (
            // All four on show rather than behind a dropdown: one click, and nothing to open.
            <RadioGroup
              id={id}
              aria-label={t('details.declineDialog.reason')}
              aria-describedby={describedBy}
              value={reason ?? ''}
              onValueChange={(value) => setReason(value as DeclineReason)}
              className="sm:grid-cols-2"
            >
              {DECLINE_REASONS.map((value) => (
                <label
                  key={value}
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-[13px] transition-colors',
                    reason === value
                      ? 'border-primary bg-tint font-semibold'
                      : 'border-border hover:bg-surface-2',
                  )}
                >
                  <RadioGroupItem value={value} />
                  {t(`details.declined.reasons.${value}`)}
                </label>
              ))}
            </RadioGroup>
          )}
        </FormField>

        <FormField
          label={t('details.declineDialog.message')}
          description={t('details.declineDialog.messageHint')}
        >
          {(fieldProps) => (
            <Textarea
              rows={3}
              maxLength={DECLINE_MESSAGE_MAX}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              {...fieldProps}
            />
          )}
        </FormField>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={loading}>
            {tCommon('actions.back')}
          </Button>
          <Button variant="destructive" onClick={confirm} loading={loading}>
            {t('details.declineDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
