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
import type { Customer, CustomerConflict } from '../types/customer.types'
import { CustomerOnFile } from './CustomerOnFile'

interface Props {
  /** The refusal to put to the counter; the dialog is open while there is one. */
  conflict: CustomerConflict | undefined
  onClose: () => void
  /** The renter is the customer on file. Labelled by the caller, which knows what follows. */
  sameLabel: string
  onSame: (customer: Customer) => void
  /** Offered only for a shared licence number: two people can hold the same one, an email cannot be shared. */
  onDifferent?: () => void
  pending?: boolean
}

/**
 * Asks whether a renter being saved is the customer already on file. The API refuses the save
 * rather than guessing: only the counter, with the person in front of them, can tell.
 */
export function CustomerConflictDialog({
  conflict,
  onClose,
  sameLabel,
  onSame,
  onDifferent,
  pending = false,
}: Props) {
  const { t } = useTranslation('customers')
  const { t: tCommon } = useTranslation('common')
  const sharedLicence = conflict?.code === 'customer_licence_on_file'

  return (
    <Dialog open={Boolean(conflict)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {conflict && (
          <>
            <DialogHeader>
              <DialogTitle>{t(`conflict.${conflict.code}.title`)}</DialogTitle>
              <DialogDescription>{t(`conflict.${conflict.code}.description`)}</DialogDescription>
            </DialogHeader>
            <CustomerOnFile customer={conflict.customer} />
            <DialogFooter>
              {sharedLicence && onDifferent ? (
                <Button variant="outline" onClick={onDifferent} disabled={pending}>
                  {t('conflict.differentPerson')}
                </Button>
              ) : (
                <Button variant="outline" onClick={onClose} disabled={pending}>
                  {tCommon('actions.cancel')}
                </Button>
              )}
              <Button onClick={() => onSame(conflict.customer)} loading={pending}>
                {sameLabel}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
