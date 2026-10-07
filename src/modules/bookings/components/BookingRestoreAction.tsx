import { useState } from 'react'
import { Undo2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { useRestoreBooking } from '../hooks/use-booking-request'

interface BookingRestoreActionProps {
  reference: string
  renterName: string
}

/** The undo for a decline made by mistake: the reservation waits to be answered again. */
export function BookingRestoreAction({ reference, renterName }: BookingRestoreActionProps) {
  const { t } = useTranslation('bookings')
  const { t: tCommon } = useTranslation('common')
  const [confirming, setConfirming] = useState(false)
  const restore = useRestoreBooking(reference, renterName)

  return (
    <>
      <PageActionButton
        icon={Undo2}
        label={t('details.actions.restore')}
        disabled={restore.isPending}
        onClick={() => setConfirming(true)}
      />

      {/* Asked first: restoring emails the renter, who was last told the answer was no. */}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('details.restoreDialog.title')}
        description={t('details.restoreDialog.description', { reference, name: renterName })}
        confirmLabel={t('details.restoreDialog.confirm')}
        cancelLabel={tCommon('actions.back')}
        confirmVariant="primary"
        loading={restore.isPending}
        // Left open on a refusal, so it can be tried again without reopening it.
        onConfirm={() => restore.mutate(undefined, { onSuccess: () => setConfirming(false) })}
      />
    </>
  )
}
