import { useTranslation } from 'react-i18next'
import { Button, type ButtonProps } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: ButtonProps['variant']
  loading?: boolean
  /** Blocks the action while the description explains why it cannot be done yet. */
  confirmDisabled?: boolean
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'destructive',
  loading = false,
  confirmDisabled = false,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useTranslation('common')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {/* pre-line: a translation can split the description into paragraphs with a blank line. */}
          {description && (
            <DialogDescription className="whitespace-pre-line">{description}</DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel ?? t('actions.cancel')}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            loading={loading}
            disabled={confirmDisabled}
          >
            {confirmLabel ?? t('actions.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
