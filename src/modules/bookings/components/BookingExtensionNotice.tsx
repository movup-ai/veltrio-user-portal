import { useState } from 'react'
import { CalendarClock, Undo2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { useFormatters } from '@/i18n'
import { ExtendRentalDialog } from '@/modules/payments/components/ExtendRentalDialog'
import { ExtensionLinkDialog, ExtensionPaidDialog } from '@/modules/payments/components/ExtensionDialogs'
import type { LinkRecipient } from '@/modules/payments/components/ShareLinkDialog'
import {
  useBookingExtensions,
  useCancelExtension,
  useExtensionSettled,
  useRecordExtensionPaid,
} from '@/modules/payments/hooks/use-booking-extensions'
import { refundDue } from '@/modules/payments/utils/booking-extension.utils'
import { useOrganizationStore } from '@/state/organization.store'
import { BookingBanner } from './BookingBanner'

type ExtensionDialog = 'link' | 'paid' | 'cancel'

interface BookingExtensionNoticeProps {
  reference: string
  renter: LinkRecipient
  returnAt: string
  pickedUp: boolean
  coverValidUntil?: string
  /** The extend dialog is opened from the manage panel, further down the page. */
  extending: boolean
  onExtendingChange: (open: boolean) => void
}

/**
 * Everything about a later return that is not the manage panel's row: the dialog that asks for
 * one, and a strip for the request waiting to be paid, with the ways to get it paid.
 */
export function BookingExtensionNotice({
  reference,
  renter,
  returnAt,
  pickedUp,
  coverValidUntil,
  extending,
  onExtendingChange,
}: BookingExtensionNoticeProps) {
  const { t } = useTranslation('payments')
  const { t: tCommon } = useTranslation('common')
  const format = useFormatters()
  const { data: extensions } = useBookingExtensions(reference)
  const companyName = useOrganizationStore((state) => state.membership?.organizationName ?? '')
  const subdomain = useOrganizationStore((state) => state.membership?.subdomain ?? '')
  const cancel = useCancelExtension(reference)
  const recordPaid = useRecordExtensionPaid(reference)
  const [dialog, setDialog] = useState<ExtensionDialog | null>(null)
  const close = () => setDialog(null)
  const pending = extensions?.pending
  useExtensionSettled(reference, extensions?.history)

  if (!extensions) return null
  const toRefund = refundDue(extensions.history)

  return (
    <>
      {pending && (
        <BookingBanner
          tone="warning"
          icon={CalendarClock}
          title={t('extension.pending.title')}
          subtitle={t('extension.pending.subtitle')}
          details={[
            { label: t('extension.pending.newReturn'), value: format.dateTime(pending.newReturnAt) },
            { label: t('extension.pending.amount'), value: format.currency(pending.amount) },
            ...(pending.expiresAt
              ? [{ label: t('extension.pending.expires'), value: format.dateTime(pending.expiresAt) }]
              : []),
            {
              label: t('extension.pending.agreed'),
              value: pending.acceptedAt ? format.dateTime(pending.acceptedAt) : t('extension.pending.notYet'),
            },
          ]}
          actions={
            <>
              {pending.link && (
                <Button type="button" size="sm" onClick={() => setDialog('link')}>
                  {t('extension.pending.share')}
                </Button>
              )}
              <Button type="button" size="sm" variant="outline" onClick={() => setDialog('paid')}>
                {t('extension.pending.markPaid')}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setDialog('cancel')}>
                {t('extension.pending.cancel')}
              </Button>
            </>
          }
        />
      )}
      {toRefund > 0 && (
        <BookingBanner
          tone="danger"
          icon={Undo2}
          title={t('extension.refundDue.title')}
          subtitle={t('extension.refundDue.subtitle')}
          details={[
            { label: t('extension.refundDue.amount'), value: format.currency(toRefund) },
            { label: t('extension.refundDue.how'), value: t('extension.refundDue.hint'), wide: true },
          ]}
        />
      )}

      <ExtendRentalDialog
        open={extending}
        onOpenChange={onExtendingChange}
        reference={reference}
        renterName={renter.name}
        returnAt={returnAt}
        pickedUp={pickedUp}
        extensions={extensions}
        coverValidUntil={coverValidUntil}
        // Asked for with the car out, the next step is getting the link to the renter.
        onRequested={(made) => made.pending?.link && setDialog('link')}
      />
      {pending && (
        <>
          {pending.link && (
            <ExtensionLinkDialog
              open={dialog === 'link'}
              onOpenChange={(open) => !open && close()}
              extension={pending}
              link={pending.link}
              renter={renter}
              companyName={companyName}
              subdomain={subdomain}
              reference={reference}
            />
          )}
          <ExtensionPaidDialog
            open={dialog === 'paid'}
            onOpenChange={(open) => !open && close()}
            extension={pending}
            loading={recordPaid.isPending}
            onSubmit={(method) => recordPaid.mutate(method, { onSuccess: close })}
          />
          <ConfirmDialog
            open={dialog === 'cancel'}
            onOpenChange={(open) => !open && close()}
            title={t('extension.cancelDialog.title')}
            description={t('extension.cancelDialog.description', {
              name: renter.name,
              when: format.dateTime(returnAt),
            })}
            confirmLabel={t('extension.cancelDialog.confirm')}
            cancelLabel={tCommon('actions.back')}
            loading={cancel.isPending}
            onConfirm={() => cancel.mutate(undefined, { onSuccess: close })}
          />
        </>
      )}
    </>
  )
}
