import { useState } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFormatters } from '@/i18n'
import { MANUAL_METHODS, type ManualMethod } from '../constants/payment.constants'
import type { BookingExtension } from '../types/booking-extension.types'
import type { PaymentLink } from '../types/booking-payment.types'
import { paymentLinkUrl } from '../utils/booking-payment.utils'
import { ShareLinkDialog, type LinkRecipient } from './ShareLinkDialog'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  extension: BookingExtension
}

/** The renter's link for a later return: they agree to it there, then pay for it. */
export function ExtensionLinkDialog({
  open,
  onOpenChange,
  extension,
  link,
  renter,
  companyName,
  subdomain,
  reference,
}: DialogProps & {
  link: PaymentLink
  renter: LinkRecipient
  companyName: string
  subdomain: string
  reference: string
}) {
  const { t } = useTranslation('payments')
  const format = useFormatters()
  const amount = format.currency(link.amount, link.currency)
  const when = format.dateTime(extension.newReturnAt)
  const url = paymentLinkUrl(subdomain, link)

  return (
    <ShareLinkDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('extension.link.title')}
      description={t('extension.link.description', { name: renter.name })}
      summary={[
        { label: t('extension.link.newReturn'), value: when },
        { label: t('extension.link.charge'), value: amount },
      ]}
      url={url}
      recipient={renter}
      subject={t('extension.link.subject', { company: companyName, reference })}
      message={t('extension.link.message', { name: renter.name, reference, when, amount, url })}
    />
  )
}

/** The extension paid outside Stripe. In full or not at all: paying it is what moves the date. */
export function ExtensionPaidDialog({
  open,
  onOpenChange,
  extension,
  loading,
  onSubmit,
}: DialogProps & { loading: boolean; onSubmit: (method: string) => void }) {
  const { t } = useTranslation('payments')
  const { t: tCommon } = useTranslation('common')
  const format = useFormatters()
  const [method, setMethod] = useState<ManualMethod>('cash')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 outline-none sm:max-w-[520px]" onOpenAutoFocus={focusDialogContent}>
        <DialogHeader>
          <DialogTitle>{t('extension.paid.title')}</DialogTitle>
          <DialogDescription>{t('extension.paid.description')}</DialogDescription>
        </DialogHeader>
        <div className="border-border-soft bg-surface-2 flex items-baseline justify-between gap-3 rounded-[10px] border px-3.5 py-3">
          <span className="text-fg-2 text-[13px]">{t('extension.paid.amount')}</span>
          <span className="text-[17px] font-bold tabular-nums">{format.currency(extension.amount)}</span>
        </div>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            // Stored in the counter's own words, as a recorded payment's method is.
            onSubmit(t(`booking.manual.methods.${method}`))
          }}
        >
          <FormField label={t('extension.paid.method')}>
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
          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {tCommon('actions.cancel')}
            </Button>
            <Button type="submit" loading={loading}>
              {t('extension.paid.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
