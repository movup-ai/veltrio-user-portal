import { useTranslation } from 'react-i18next'
import { CopyLinkField } from '@/components/forms/CopyLinkField'
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
import type { SentInvitation } from '../types/users.types'

/**
 * The link just sent, for passing on by hand as well. It is shown once: the API keeps only its
 * hash, so closing this is the last chance to copy it until the invitation is sent again.
 */
export function InvitationSentDialog({
  invitation,
  onOpenChange,
}: {
  invitation: SentInvitation | undefined
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')

  return (
    <Dialog open={Boolean(invitation)} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 outline-none sm:max-w-[520px]" onOpenAutoFocus={focusDialogContent}>
        <DialogHeader>
          <DialogTitle>{t('users.sent.title')}</DialogTitle>
          <DialogDescription>
            {invitation &&
              t(invitation.emailQueued ? 'users.sent.emailed' : 'users.sent.notEmailed', {
                email: invitation.email,
              })}
          </DialogDescription>
        </DialogHeader>

        <CopyLinkField
          id="invite-link"
          label={t('users.sent.link')}
          url={invitation?.inviteUrl ?? ''}
          copyLabel={t('users.sent.copy')}
          copiedLabel={t('users.sent.copied')}
          copyFailed={t('users.sent.copyFailed')}
          help={t('users.sent.linkHelp')}
        />

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {tCommon('actions.done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
